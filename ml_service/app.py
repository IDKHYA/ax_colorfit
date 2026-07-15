# 독립 ML 서비스 진입점 — 일반 누끼(FR-040)와 정밀 의류 추출(FR-041)을 제공합니다.
# server/, api/의 Vercel 경량 API와는 별도 프로세스·별도 배포 대상이다(FR-042 경계).
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .image_processing import InvalidImageError, decode_upload, now_iso, to_data_url
from .inference import cloth_extraction, general_background_removal
from .models import get_cloth_session, get_general_session, models_ready, preload_models

GENERAL_MODEL_VERSION = "rembg-u2net-v1"
CLOTH_MODEL_VERSION = "rembg-u2net-cloth-seg-v1"

# NFR-003: CORS는 필요한 프론트 Origin만 허용한다. 기본값은 로컬 개발 서버로 제한하고,
# 운영 배포에서는 ALLOWED_ORIGINS 환경변수로 실제 프론트 도메인만 지정해야 한다.
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3100").split(",")
    if origin.strip()
]


@asynccontextmanager
async def _lifespan(_: FastAPI):
    # NFR-002/FR-041: 요청마다 모델을 다시 로드하지 않도록 프로세스 시작 시 한 번만 준비한다.
    preload_models()
    yield


app = FastAPI(title="ColorFit ML Service", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _require_models_ready() -> None:
    ready = models_ready()
    if not all(ready.values()):
        raise HTTPException(status_code=503, detail="모델이 아직 로딩 중입니다. 잠시 후 다시 시도해 주세요.")


async def _read_upload_image(file: UploadFile):
    data = await file.read()
    try:
        return decode_upload(data)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/health")
async def get_health():
    ready = models_ready()
    return {"ok": True, "modelsReady": all(ready.values()), "models": ready}


@app.post("/api/background/remove")
async def post_background_remove(file: UploadFile = File(...)):
    _require_models_ready()
    image = await _read_upload_image(file)
    try:
        rgba, bbox, colors = general_background_removal(image, get_general_session())
    except Exception as exc:  # noqa: BLE001 - 예측 실패 원인을 사용자에게 노출하지 않고 500으로 통일한다
        raise HTTPException(status_code=500, detail="배경 제거 처리 중 오류가 발생했습니다.") from exc
    return {
        "imageDataUrl": to_data_url(rgba),
        "width": rgba.width,
        "height": rgba.height,
        "bbox": bbox,
        "colors": colors,
        "model": "u2net",
        "version": GENERAL_MODEL_VERSION,
        "processedAt": now_iso(),
    }


@app.post("/api/clothing/extract")
async def post_clothing_extract(file: UploadFile = File(...), targetPart: str = Form("auto")):
    _require_models_ready()
    image = await _read_upload_image(file)
    try:
        rgba, bbox, colors, detected_category = cloth_extraction(
            image, get_cloth_session(), get_general_session(), targetPart
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="정밀 의류 추출 처리 중 오류가 발생했습니다.") from exc

    payload = {
        "imageDataUrl": to_data_url(rgba),
        "width": rgba.width,
        "height": rgba.height,
        "bbox": bbox,
        "colors": colors,
        "model": "u2net_cloth_seg" if detected_category else "u2net",
        "version": CLOTH_MODEL_VERSION if detected_category else GENERAL_MODEL_VERSION,
        "processedAt": now_iso(),
    }
    if detected_category:
        payload["detectedCategory"] = detected_category
    return payload
