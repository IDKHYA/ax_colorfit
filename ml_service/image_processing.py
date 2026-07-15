# 업로드 이미지 검증, 색상·bbox 계산, 응답 인코딩을 담당합니다(NFR-002 용량 제한, NFR-003 디코딩 검증).
from __future__ import annotations

import base64
import io
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from PIL import Image

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_INFERENCE_SIDE = 1024


class InvalidImageError(ValueError):
    pass


def decode_upload(data: bytes) -> Image.Image:
    if not data:
        raise InvalidImageError("빈 파일은 처리할 수 없습니다.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise InvalidImageError(
            f"이미지 용량이 너무 큽니다({len(data)} bytes, 최대 {MAX_UPLOAD_BYTES} bytes)."
        )
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception as exc:  # noqa: BLE001 - PIL은 손상된 이미지에 다양한 예외를 던진다
        raise InvalidImageError(
            "이미지를 디코딩할 수 없습니다. 지원하는 이미지 파일인지 확인해 주세요."
        ) from exc
    return image.convert("RGB")


def resize_for_inference(image: Image.Image) -> Image.Image:
    longest = max(image.size)
    if longest <= MAX_INFERENCE_SIDE:
        return image
    scale = MAX_INFERENCE_SIDE / longest
    new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(new_size, Image.LANCZOS)


def compute_bbox(binary_mask: np.ndarray) -> Optional[dict]:
    ys, xs = np.where(binary_mask)
    if ys.size == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return {"x": x0, "y": y0, "width": x1 - x0 + 1, "height": y1 - y0 + 1}


def dominant_colors(rgb_array: np.ndarray, binary_mask: np.ndarray, top_n: int = 5) -> list[dict]:
    pixels = rgb_array[binary_mask]
    if pixels.shape[0] == 0:
        return []
    buckets = (pixels.astype(np.int32) // 24)
    keys = buckets[:, 0] * 10_000 + buckets[:, 1] * 100 + buckets[:, 2]
    unique_keys, inverse, counts = np.unique(keys, return_inverse=True, return_counts=True)
    order = np.argsort(-counts)[:top_n]
    total = pixels.shape[0]
    results = []
    for rank in order:
        bucket_pixels = pixels[inverse == rank]
        mean_rgb = bucket_pixels.mean(axis=0)
        r, g, b = (int(round(channel)) for channel in mean_rgb)
        results.append(
            {
                "hex": f"#{r:02X}{g:02X}{b:02X}",
                "ratio": round(float(counts[rank]) / total, 4),
                "rgb": [r, g, b],
            }
        )
    return results


def apply_mask_as_alpha(image_rgb: Image.Image, alpha_mask: np.ndarray) -> Image.Image:
    rgba = np.dstack([np.array(image_rgb), alpha_mask.astype(np.uint8)])
    return Image.fromarray(rgba)


def to_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
