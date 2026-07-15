# server/app.py가 부모 저장소 경로에 의존하지 않고, ML 라우트를 명확한 503 안내로 응답하는지 검증합니다(FR-042, NFR-001).
from __future__ import annotations

import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from server.app import app


class MlBoundaryContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_ml_bridge_module_no_longer_exists(self):
        # 부모 저장소 경로를 파일 경로로 불러오던 브리지 모듈은 이번 단계에서 제거된다.
        self.assertFalse((Path(__file__).resolve().parents[1] / "ml_bridge.py").exists())

    def test_server_source_has_no_parent_repo_path_reference(self):
        server_dir = Path(__file__).resolve().parents[1]
        for py_file in server_dir.glob("*.py"):
            source = py_file.read_text(encoding="utf-8")
            self.assertNotIn("parents[2]", source, f"{py_file.name}에 부모 저장소 경로 참조가 남아있다")

    def test_ml_routes_answer_with_unavailable_guidance(self):
        for path in ("/api/background/remove", "/api/clothing/extract"):
            response = self.client.post(path)
            self.assertEqual(response.status_code, 503)
            self.assertIn("직접 입력", response.json()["detail"])

    def test_health_and_ingest_routes_still_registered(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        for path in ("/api/ingest/url", "/api/ingest/image"):
            self.assertEqual(self.client.post(path, json={}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
