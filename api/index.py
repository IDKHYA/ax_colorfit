# Vercel 서버리스 엔트리 — v2 API에서 URL 수집 라우트만 노출하고, ML 라우트는 명시적 안내로 대체합니다.
from __future__ import annotations

import sys
from pathlib import Path

# Vercel 함수 프로세스는 임의 작업 디렉터리에서 뜨므로 프로젝트 루트(v2)를 import 경로에 넣는다.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException  # noqa: E402

from server.app import app as full_app  # noqa: E402

SERVERLESS_ROUTE_PATHS = {"/api/health", "/api/ingest/url", "/api/ingest/image"}
ML_UNAVAILABLE_DETAIL = (
    "이 배포에는 AI 이미지 분석 서버가 포함되어 있지 않습니다. "
    "색상과 분류를 직접 입력해 주세요. 누끼와 자동 분석은 로컬 서버(npm run dev:api)에서 쓸 수 있습니다."
)

app = FastAPI(title="Personal Color Wardrobe v2 API (serverless)")

# CORS 미들웨어는 복사하지 않는다 — 같은 도메인의 정적 프론트에서만 쓰는 프록시라,
# 교차 출처를 열어 두면 다른 사이트가 이 프록시를 대신 쓰는 남용 경로가 생긴다.
for route in full_app.router.routes:
    if getattr(route, "path", "") in SERVERLESS_ROUTE_PATHS:
        app.router.routes.append(route)


@app.post("/api/background/remove")
@app.post("/api/clothing/extract")
async def ml_unavailable() -> None:
    raise HTTPException(status_code=503, detail=ML_UNAVAILABLE_DETAIL)
