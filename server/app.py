# URL 수집 프록시 엔드포인트를 FastAPI 앱으로 노출합니다.
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from .ml_bridge import load_legacy_image_router
from .url_ingest import (
    DnsResolver,
    HttpxUrlFetcher,
    IngestBlockedError,
    IngestError,
    UrlFetcher,
    fetch_image_bytes,
    ingest_url as run_url_ingest,
    resolve_hostname,
)


app = FastAPI(title="Personal Color Wardrobe v2 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UrlIngestRequest(BaseModel):
    url: str


def get_url_fetcher() -> UrlFetcher:
    return HttpxUrlFetcher()


def get_dns_resolver() -> DnsResolver:
    return resolve_hostname


@app.get("/api/health")
async def get_health():
    return {"ok": True}


@app.post("/api/ingest/url")
async def post_ingest_url(
    payload: UrlIngestRequest,
    fetcher: Annotated[UrlFetcher, Depends(get_url_fetcher)],
    resolver: Annotated[DnsResolver, Depends(get_dns_resolver)],
):
    try:
        result = await run_url_ingest(payload.url, fetcher=fetcher, resolver=resolver)
    except IngestBlockedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IngestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result.to_api_payload()


@app.post("/api/ingest/image")
async def post_ingest_image(
    payload: UrlIngestRequest,
    fetcher: Annotated[UrlFetcher, Depends(get_url_fetcher)],
    resolver: Annotated[DnsResolver, Depends(get_dns_resolver)],
):
    try:
        image = await fetch_image_bytes(payload.url, fetcher=fetcher, resolver=resolver)
    except IngestBlockedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IngestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return Response(content=image.body, media_type=image.content_type)


# 수동 등록 누끼·정밀 추출은 v1 이미지 서버 라우트를 그대로 재사용합니다(같은 8001 포트 한 프로세스).
# v2 라우트 뒤에 등록해 /api/health 같은 중복 경로는 v2 정의가 우선하게 합니다.
_legacy_image_router = load_legacy_image_router()
if _legacy_image_router is not None:
    app.include_router(_legacy_image_router)
