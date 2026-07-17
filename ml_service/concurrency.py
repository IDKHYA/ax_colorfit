# CPU 바운드 추론 호출을 스레드풀로 넘기고 동시 처리 개수를 제한합니다.
#
# rembg 추론은 동기(blocking) 호출이라 FastAPI 엔드포인트 안에서 그대로 부르면 이벤트 루프
# 하나를 통째로 막아, 그 순간 다른 사용자의 요청(추천 계산, health check 등)까지 같이 멈춘다.
# run_in_threadpool로 스레드에 위임해 이벤트 루프를 막지 않게 하고, 동시에 도는 추론 개수를
# capacity로 제한해 CPU 코어 이상으로 몰릴 때는 대기시키는 대신 즉시 "혼잡" 상태를 정직하게
# 반환한다(FR-042 상태 구분 원칙과 동일한 접근).
from __future__ import annotations

import os
from typing import Callable, TypeVar

from starlette.concurrency import run_in_threadpool

T = TypeVar("T")


class BusyError(Exception):
    """동시 처리 한도를 넘어 즉시 거절됐음을 나타낸다."""


class InferenceGate:
    def __init__(self, capacity: int):
        if capacity < 1:
            raise ValueError("capacity는 1 이상이어야 한다")
        self.capacity = capacity
        self._active = 0

    @property
    def active(self) -> int:
        return self._active

    async def run(self, func: Callable[..., T], *args, **kwargs) -> T:
        # 아래 두 줄 사이에 await가 없어 단일 스레드 이벤트 루프에서 원자적으로 실행된다.
        if self._active >= self.capacity:
            raise BusyError(f"동시 처리 한도({self.capacity})를 초과했습니다.")
        self._active += 1
        try:
            return await run_in_threadpool(func, *args, **kwargs)
        finally:
            self._active -= 1


def default_capacity() -> int:
    configured = os.getenv("ML_CONCURRENCY_LIMIT")
    if configured:
        try:
            return max(1, int(configured))
        except ValueError:
            pass
    return max(1, min(4, os.cpu_count() or 2))


_gate: InferenceGate | None = None


def get_gate() -> InferenceGate:
    global _gate
    if _gate is None:
        _gate = InferenceGate(default_capacity())
    return _gate


def reset_for_tests() -> None:
    """테스트에서 ML_CONCURRENCY_LIMIT 변경을 반영하기 위한 초기화 유틸입니다."""
    global _gate
    _gate = None
