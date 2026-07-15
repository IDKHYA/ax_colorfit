# Vercel 서버리스 엔트리(api/index.py)가 수집 라우트만 노출하고 ML 라우트는 503 안내로 답하는지 검증합니다.
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

ENTRY_PATH = Path(__file__).resolve().parents[2] / "api" / "index.py"


def load_entry_app():
    spec = importlib.util.spec_from_file_location("vercel_entry_index", ENTRY_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.app


class VercelEntryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(load_entry_app())

    def test_health_route_is_exposed(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])

    def test_ingest_routes_are_exposed(self):
        # 수집 동작 자체는 test_url_ingest가 검증하므로 여기서는 라우트 도달(422 = 요청 검증 계층)만 확인한다.
        for path in ("/api/ingest/url", "/api/ingest/image"):
            response = self.client.post(path, json={})
            self.assertEqual(response.status_code, 422)

    def test_ml_routes_answer_with_unavailable_guidance(self):
        for path in ("/api/background/remove", "/api/clothing/extract"):
            response = self.client.post(path)
            self.assertEqual(response.status_code, 503)
            self.assertIn("직접 입력", response.json()["detail"])

    def test_no_cors_headers_for_cross_origin(self):
        # 같은 도메인 전용 프록시 — 교차 출처 응답 헤더가 없어야 외부 사이트의 프록시 남용을 막는다.
        response = self.client.get("/api/health", headers={"origin": "https://evil.example"})
        self.assertIsNone(response.headers.get("access-control-allow-origin"))
