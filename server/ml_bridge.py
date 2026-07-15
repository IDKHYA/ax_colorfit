# v1 이미지 처리 서버(누끼·정밀 추출)를 파일 경로로 불러와 v2 앱에 라우트를 합칩니다.
from __future__ import annotations

import importlib.util
from pathlib import Path

from fastapi import APIRouter

# v2/server 패키지 이름이 루트 server 패키지와 겹치므로 일반 import 대신 파일 경로 로딩을 씁니다.
LEGACY_MODULE_PATH = Path(__file__).resolve().parents[2] / "server" / "background_remove_api.py"


def load_legacy_image_router() -> APIRouter | None:
    """v1 서버 모듈의 이미지 처리 라우트만 반환합니다. 모듈이 없거나 import에 실패하면 None을 반환해 URL 수집 기능은 계속 동작하게 합니다."""
    if not LEGACY_MODULE_PATH.exists():
        return None
    try:
        spec = importlib.util.spec_from_file_location("legacy_background_remove_api", LEGACY_MODULE_PATH)
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception:
        return None

    # docs, health 같은 기본 라우트는 v2 앱 것이 이미 있으므로 이미지 처리 경로만 골라 담습니다.
    router = APIRouter()
    for route in module.app.router.routes:
        path = getattr(route, "path", "")
        if path in {"/api/background/remove", "/api/clothing/extract"}:
            router.routes.append(route)
    return router
