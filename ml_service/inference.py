# 일반 누끼(FR-040)와 정밀 의류 추출(FR-041) 추론 로직입니다.
from __future__ import annotations

from typing import Optional

import numpy as np
from PIL import Image

from .image_processing import apply_mask_as_alpha, compute_bbox, dominant_colors, resize_for_inference

# 옷 영역으로 인정할 최소 비율. 이보다 작으면 탐지 실패로 보고 카테고리를 단정하지 않는다(가짜 성공 방지, FR-042).
MIN_CLOTH_AREA_RATIO = 0.02

# u2net_cloth_seg가 실제로 구분할 수 있는 부위만 정밀 카테고리로 보고한다.
CLOTH_AWARE_TARGETS = {"upper", "lower"}


def general_background_removal(image_rgb: Image.Image, general_session) -> tuple[Image.Image, Optional[dict], list[dict]]:
    resized = resize_for_inference(image_rgb)
    mask_image = general_session.predict(resized)[0]
    mask_array = np.array(mask_image)
    binary_mask = mask_array > 127

    rgba = apply_mask_as_alpha(resized, mask_array)
    bbox = compute_bbox(binary_mask)
    colors = dominant_colors(np.array(resized), binary_mask)
    return rgba, bbox, colors


def cloth_extraction(
    image_rgb: Image.Image,
    cloth_session,
    general_session,
    target_part: str,
) -> tuple[Image.Image, Optional[dict], list[dict], Optional[str]]:
    resized = resize_for_inference(image_rgb)
    total_pixels = resized.width * resized.height

    if cloth_session is None:
        # 이 배포 프로필은 정밀 의류 추출 모델을 올리지 않는다(메모리 절약). 카테고리를 지어내지 않고
        # 일반 세그멘테이션만 정직하게 수행한다.
        rgba, bbox, colors = general_background_removal(image_rgb, general_session)
        return rgba, bbox, colors, None

    if target_part in CLOTH_AWARE_TARGETS:
        mask_image = cloth_session.predict(resized, cc=target_part)[0]
        binary_mask = np.array(mask_image) > 127
        detected_category = target_part if binary_mask.sum() / total_pixels >= MIN_CLOTH_AREA_RATIO else None
    elif target_part == "auto":
        masks = cloth_session.predict(resized)
        binary_masks = [np.array(mask) > 127 for mask in masks]
        areas = [mask.sum() for mask in binary_masks]
        best_index = int(np.argmax(areas))
        if areas[best_index] / total_pixels < MIN_CLOTH_AREA_RATIO:
            # 옷 영역 탐지 실패 — 일반 세그멘테이션으로 폴백하고 카테고리는 주장하지 않는다.
            rgba, bbox, colors = general_background_removal(image_rgb, general_session)
            return rgba, bbox, colors, None
        binary_mask = binary_masks[best_index]
        # cloth_seg는 upper/lower/full 3종만 구분한다. full(원피스류)은 단일 카테고리로 단정하지 않는다.
        detected_category = ["upper", "lower", None][best_index]
    else:
        # outer/shoes/bag/accessory — 보유 모델이 구분하지 못하는 부위라 일반 세그멘테이션만 정직하게 수행한다.
        rgba, bbox, colors = general_background_removal(image_rgb, general_session)
        return rgba, bbox, colors, None

    rgba = apply_mask_as_alpha(resized, (binary_mask * 255).astype(np.uint8))
    bbox = compute_bbox(binary_mask)
    colors = dominant_colors(np.array(resized), binary_mask)
    return rgba, bbox, colors, detected_category
