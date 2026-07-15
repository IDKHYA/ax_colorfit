# URL 수집 프록시 엔드포인트를 FastAPI 앱으로 노출합니다.
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

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


# 실제 ML(누끼·정밀 추출) 서비스 복구는 FRD 단계 2 대상이다. 이번 단계는 부모 저장소 경로 의존을
# 완전히 제거하는 데 한정하므로, 로컬 서버도 Vercel 서버리스 엔트리와 동일하게 명확한 503으로 안내한다.
ML_UNAVAILABLE_DETAIL = (
    "이 배포에는 AI 이미지 분석 서버가 포함되어 있지 않습니다. "
    "색상과 분류를 직접 입력해 주세요. 누끼와 자동 분석은 독립 ML 서비스 연결 후 쓸 수 있습니다."
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


@app.post("/api/background/remove")
@app.post("/api/clothing/extract")
async def ml_unavailable() -> None:
    raise HTTPException(status_code=503, detail=ML_UNAVAILABLE_DETAIL)
