# ML 모델 세션을 프로세스당 한 번만 생성해 재사용하는 로더입니다(FR-041 모델 사전 준비, NFR-002 재사용).
#
# rembg.new_session()은 onnxruntime의 CPU 메모리 아레나를 켠 채로 세션을 만든다. 아레나를 켜 두면
# 추론을 반복할수록 RSS가 계속 늘어나며 반환되지 않는다(실측: 두 모델+추론 1회 870MB, 반복 시 985MB까지
# 증가). 무료 티어(예: Render 512MB)에서도 안정적으로 뜨도록 rembg의 세션 클래스는 그대로 재사용하되
# SessionOptions만 직접 만들어 아레나·메모리 패턴 최적화를 끈다(실측: 두 모델+반복 추론 시에도 약 410MB로
# 평평하게 유지).
from __future__ import annotations

import os

import onnxruntime as ort
from rembg.sessions import U2netSession, Unet2ClothSession
from rembg.sessions.base import BaseSession

GENERAL_MODEL_NAME = "u2net"
CLOTH_MODEL_NAME = "u2net_cloth_seg"

# 무료 512MB 티어 배포용 경량 프로필. 실측 기준 두 모델을 다 올리면 FastAPI 구동 상태에서
# 약 558MB로 512MB를 넘지만, u2net 하나만 쓰면 약 376~430MB로 안전하게 들어간다.
# 이 값이 true면 정밀 의류 추출(u2net_cloth_seg)을 아예 로드하지 않고, /api/clothing/extract는
# 항상 일반 세그멘테이션 폴백만 정직하게 수행한다(가짜 성공 금지 원칙과 일치).
def cloth_segmentation_enabled() -> bool:
    return os.getenv("ENABLE_CLOTH_SEGMENTATION", "true").strip().lower() != "false"

_SESSION_CLASSES: dict[str, type[BaseSession]] = {
    GENERAL_MODEL_NAME: U2netSession,
    CLOTH_MODEL_NAME: Unet2ClothSession,
}

_sessions: dict[str, BaseSession] = {}


def _low_memory_session_options() -> ort.SessionOptions:
    opts = ort.SessionOptions()
    opts.enable_cpu_mem_arena = False
    opts.enable_mem_pattern = False
    return opts


def _get_or_create(name: str) -> BaseSession:
    if name not in _sessions:
        session_class = _SESSION_CLASSES[name]
        _sessions[name] = session_class(name, _low_memory_session_options())
    return _sessions[name]


def get_general_session() -> BaseSession:
    return _get_or_create(GENERAL_MODEL_NAME)


def get_cloth_session() -> BaseSession | None:
    if not cloth_segmentation_enabled():
        return None
    return _get_or_create(CLOTH_MODEL_NAME)


def preload_models() -> None:
    """앱 시작 시 한 번 호출해 필요한 모델을 메모리에 올려 두어 요청마다 재로드하지 않게 한다."""
    get_general_session()
    get_cloth_session()


def models_ready() -> dict[str, bool]:
    """이번 배포 프로필에서 실제로 쓰는 모델만 보고한다. 비활성화된 모델은 항목 자체를 넣지 않아
    "로드됐다"는 거짓 신호를 주지 않는다."""
    ready = {GENERAL_MODEL_NAME: GENERAL_MODEL_NAME in _sessions}
    if cloth_segmentation_enabled():
        ready[CLOTH_MODEL_NAME] = CLOTH_MODEL_NAME in _sessions
    return ready


def reset_for_tests() -> None:
    """테스트에서 세션 재사용 여부를 검증하기 위한 초기화 유틸입니다. 운영 코드 경로에서는 쓰지 않는다."""
    _sessions.clear()
