# ML 모델 세션을 프로세스당 한 번만 생성해 재사용하는 로더입니다(FR-041 모델 사전 준비, NFR-002 재사용).
from __future__ import annotations

from rembg import new_session
from rembg.sessions.base import BaseSession

GENERAL_MODEL_NAME = "u2net"
CLOTH_MODEL_NAME = "u2net_cloth_seg"

_sessions: dict[str, BaseSession] = {}


def _get_or_create(name: str) -> BaseSession:
    if name not in _sessions:
        _sessions[name] = new_session(name)
    return _sessions[name]


def get_general_session() -> BaseSession:
    return _get_or_create(GENERAL_MODEL_NAME)


def get_cloth_session() -> BaseSession:
    return _get_or_create(CLOTH_MODEL_NAME)


def preload_models() -> None:
    """앱 시작 시 한 번 호출해 두 모델을 모두 메모리에 올려 두어 요청마다 재로드하지 않게 한다."""
    get_general_session()
    get_cloth_session()


def models_ready() -> dict[str, bool]:
    return {
        GENERAL_MODEL_NAME: GENERAL_MODEL_NAME in _sessions,
        CLOTH_MODEL_NAME: CLOTH_MODEL_NAME in _sessions,
    }


def reset_for_tests() -> None:
    """테스트에서 세션 재사용 여부를 검증하기 위한 초기화 유틸입니다. 운영 코드 경로에서는 쓰지 않는다."""
    _sessions.clear()
