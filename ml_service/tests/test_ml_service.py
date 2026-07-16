# 독립 ML 서비스 통합 테스트 — FR-040(일반 누끼), FR-041(정밀 추출), FR-042(상태·오류 구분),
# NFR-002/003(용량·MIME 검증, CORS 경계)을 검증합니다.
from __future__ import annotations

import base64
import io
import os
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from ml_service import models
from ml_service.app import app


def _make_test_image_bytes(size=(96, 96), color=(30, 60, 200)) -> bytes:
    image = Image.new("RGB", size, (245, 245, 245))
    for x in range(size[0] // 4, size[0] * 3 // 4):
        for y in range(size[1] // 4, size[1] * 3 // 4):
            image.putpixel((x, y), color)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class MlServiceContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()  # startup 이벤트(모델 사전 로드)를 실제로 실행한다.
        cls.image_bytes = _make_test_image_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_health_reports_models_ready_after_startup(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertTrue(body["modelsReady"])
        self.assertTrue(body["models"]["u2net"])
        self.assertTrue(body["models"]["u2net_cloth_seg"])

    def test_background_remove_returns_contract_shaped_payload(self):
        response = self.client.post(
            "/api/background/remove",
            files={"file": ("clothing.png", self.image_bytes, "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["imageDataUrl"].startswith("data:image/png;base64,"))
        decoded = base64.b64decode(body["imageDataUrl"].split(",", 1)[1])
        out_image = Image.open(io.BytesIO(decoded))
        self.assertEqual(out_image.mode, "RGBA")
        self.assertEqual(body["width"], out_image.width)
        self.assertEqual(body["height"], out_image.height)
        self.assertEqual(body["model"], "u2net")
        self.assertIn("version", body)
        self.assertIn("processedAt", body)
        self.assertIsInstance(body["colors"], list)
        # 일반 누끼는 세부 의류 분류 신호가 없으므로 분류 필드를 지어내지 않는다(가짜 성공 금지).
        self.assertNotIn("detectedCategory", body)
        self.assertNotIn("fineLabels", body)
        self.assertNotIn("predictedSeason", body)

    def test_clothing_extract_upper_reports_detected_category_or_omits_when_unsure(self):
        response = self.client.post(
            "/api/clothing/extract",
            data={"targetPart": "upper"},
            files={"file": ("clothing.png", self.image_bytes, "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        if "detectedCategory" in body:
            self.assertEqual(body["detectedCategory"], "upper")
            self.assertEqual(body["model"], "u2net_cloth_seg")

    def test_clothing_extract_for_outer_uses_honest_general_fallback(self):
        # cloth_seg 모델은 아우터/신발/가방/액세서리를 구분하지 못하므로 카테고리를 단정하지 않는다.
        response = self.client.post(
            "/api/clothing/extract",
            data={"targetPart": "outer"},
            files={"file": ("clothing.png", self.image_bytes, "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("detectedCategory", body)
        self.assertEqual(body["model"], "u2net")

    def test_oversized_upload_is_rejected(self):
        oversized = b"0" * (10 * 1024 * 1024 + 1)
        response = self.client.post(
            "/api/background/remove",
            files={"file": ("huge.png", oversized, "image/png")},
        )
        self.assertEqual(response.status_code, 400)

    def test_non_image_bytes_are_rejected(self):
        response = self.client.post(
            "/api/background/remove",
            files={"file": ("not-an-image.txt", b"hello world", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)

    def test_cors_only_allows_configured_origin(self):
        allowed = self.client.get("/api/health", headers={"origin": "http://localhost:3100"})
        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "http://localhost:3100")

        blocked = self.client.get("/api/health", headers={"origin": "https://evil.example"})
        self.assertIsNone(blocked.headers.get("access-control-allow-origin"))


class ModelReuseTest(unittest.TestCase):
    def setUp(self):
        models.reset_for_tests()

    def tearDown(self):
        models.reset_for_tests()

    def test_general_session_is_created_once_and_reused(self):
        first = models.get_general_session()
        second = models.get_general_session()
        self.assertIs(first, second)

    def test_cloth_session_is_created_once_and_reused(self):
        first = models.get_cloth_session()
        second = models.get_cloth_session()
        self.assertIs(first, second)


class LowMemorySessionConfigTest(unittest.TestCase):
    """무료 512MB 티어에서도 안정적으로 뜨도록 onnxruntime 메모리 아레나를 비활성화했는지 검증한다.

    아레나(enable_cpu_mem_arena)를 켜 두면 요청을 반복할수록 RSS가 계속 늘어나(실측 380MB → 985MB)
    무료 티어 메모리 한도를 넘는다. 비활성화하면 반복 호출에도 메모리가 평평하게 유지된다(실측 236MB).
    """

    def setUp(self):
        models.reset_for_tests()

    def tearDown(self):
        models.reset_for_tests()

    def test_general_session_disables_memory_arena_and_pattern(self):
        opts = models.get_general_session().inner_session.get_session_options()
        self.assertFalse(opts.enable_cpu_mem_arena)
        self.assertFalse(opts.enable_mem_pattern)

    def test_cloth_session_disables_memory_arena_and_pattern(self):
        opts = models.get_cloth_session().inner_session.get_session_options()
        self.assertFalse(opts.enable_cpu_mem_arena)
        self.assertFalse(opts.enable_mem_pattern)


class GeneralOnlyProfileTest(unittest.TestCase):
    """ENABLE_CLOTH_SEGMENTATION=false 배포 프로필(무료 512MB 티어용)을 검증한다.

    실측: 두 모델을 다 올리면 FastAPI 구동 상태에서 약 558MB로 무료 512MB를 넘지만,
    u2net 하나만 쓰면 약 376~430MB로 안전하게 들어간다. 이 프로필에서는 정밀 추출을
    시도하지 않고 항상 정직한 일반 세그멘테이션 폴백만 수행해야 한다(가짜 성공 금지).
    """

    def setUp(self):
        models.reset_for_tests()
        os.environ["ENABLE_CLOTH_SEGMENTATION"] = "false"

    def tearDown(self):
        models.reset_for_tests()
        os.environ.pop("ENABLE_CLOTH_SEGMENTATION", None)

    def test_cloth_session_is_not_created(self):
        self.assertIsNone(models.get_cloth_session())
        self.assertNotIn(models.CLOTH_MODEL_NAME, models.models_ready())

    def test_preload_does_not_load_cloth_model(self):
        models.preload_models()
        self.assertNotIn(models.CLOTH_MODEL_NAME, models._sessions)

    def test_health_and_extract_stay_honest_without_cloth_model(self):
        with TestClient(app) as client:
            health = client.get("/api/health").json()
            self.assertTrue(health["modelsReady"])
            self.assertNotIn(models.CLOTH_MODEL_NAME, health["models"])

            image_bytes = _make_test_image_bytes()
            response = client.post(
                "/api/clothing/extract",
                data={"targetPart": "upper"},
                files={"file": ("clothing.png", image_bytes, "image/png")},
            )
            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertNotIn("detectedCategory", body)
            self.assertEqual(body["model"], "u2net")


class NoParentRepoDependencyTest(unittest.TestCase):
    def test_ml_service_source_has_no_parent_repo_path_reference(self):
        service_dir = Path(__file__).resolve().parents[1]
        for py_file in service_dir.glob("*.py"):
            source = py_file.read_text(encoding="utf-8")
            self.assertNotIn("parents[2]", source, f"{py_file.name}에 부모 저장소 경로 참조가 남아있다")
            self.assertNotIn("background_remove_api", source, f"{py_file.name}이 옛 v1 ML 모듈을 참조한다")


if __name__ == "__main__":
    unittest.main()
