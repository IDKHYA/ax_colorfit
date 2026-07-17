# /api/background/remove, /api/clothing/extract가 동시 처리 한도를 넘으면 즉시 503로
# 거절하고, 한도 안에서는 정상 처리되는지 실제 HTTP 요청으로 검증합니다(FR-042 상태 구분).
from __future__ import annotations

import io
import os
import threading
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

from ml_service import concurrency
from ml_service.app import app


def _tiny_png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (10, 20, 30)).save(buffer, format="PNG")
    return buffer.getvalue()


class ConcurrencyLimitHttpTest(unittest.TestCase):
    def setUp(self):
        concurrency.reset_for_tests()
        os.environ["ML_CONCURRENCY_LIMIT"] = "1"

    def tearDown(self):
        concurrency.reset_for_tests()
        os.environ.pop("ML_CONCURRENCY_LIMIT", None)

    def test_second_concurrent_request_gets_honest_busy_503(self):
        started = threading.Event()
        release = threading.Event()

        def fake_removal(image, _session):
            started.set()
            release.wait(timeout=5)
            return Image.new("RGBA", image.size), None, []

        with patch("ml_service.app.general_background_removal", side_effect=fake_removal):
            with TestClient(app) as client:
                results = {}

                def call_first():
                    results["first"] = client.post(
                        "/api/background/remove",
                        files={"file": ("x.png", _tiny_png_bytes(), "image/png")},
                    )

                first_thread = threading.Thread(target=call_first)
                first_thread.start()
                self.assertTrue(started.wait(timeout=5), "첫 요청이 제시간에 시작되지 않았다")

                second = client.post(
                    "/api/background/remove",
                    files={"file": ("x.png", _tiny_png_bytes(), "image/png")},
                )
                self.assertEqual(second.status_code, 503)
                self.assertIn("많습니다", second.json()["detail"])

                health_during_busy = client.get("/api/health").json()
                self.assertEqual(health_during_busy["concurrency"], {"capacity": 1, "active": 1})

                release.set()
                first_thread.join(timeout=5)

        self.assertEqual(results["first"].status_code, 200)

    def test_requests_within_capacity_succeed_sequentially(self):
        with TestClient(app) as client:
            for _ in range(3):
                response = client.post(
                    "/api/background/remove",
                    files={"file": ("x.png", _tiny_png_bytes(), "image/png")},
                )
                self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
