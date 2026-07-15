# Vercel 서버리스 엔트리 — v2 API에서 URL 수집 라우트만 노출하고, ML 라우트는 명시적 안내로 대체합니다.
from __future__ import annotations

import sys
from pathlib import Path

# Vercel 함수 프로세스는 임의 작업 디렉터리에서 뜨므로 프로젝트 루트(v2)를 import 경로에 넣는다.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI  # noqa: E402

from server.app import app as full_app  # noqa: E402

# ML 라우트도 server.app이 등록한 라우트를 그대로 재사용한다 — 503 안내 문구를 두 곳에서
# 따로 관리하지 않기 위해서다. server.app은 실제 ML 구현이 없는 동안 항상 503으로 답한다.
SERVERLESS_ROUTE_PATHS = {
    "/api/health",
    "/api/ingest/url",
    "/api/ingest/image",
    "/api/background/remove",
    "/api/clothing/extract",
}

app = FastAPI(title="Personal Color Wardrobe v2 API (serverless)")

# CORS 미들웨어는 복사하지 않는다 — 같은 도메인의 정적 프론트에서만 쓰는 프록시라,
# 교차 출처를 열어 두면 다른 사이트가 이 프록시를 대신 쓰는 남용 경로가 생긴다.
for route in full_app.router.routes:
    if getattr(route, "path", "") in SERVERLESS_ROUTE_PATHS:
        app.router.routes.append(route)
