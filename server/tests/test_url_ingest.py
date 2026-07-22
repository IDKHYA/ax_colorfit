# URL 수집 서버 프록시의 안전장치와 응답 분기 계약을 검증합니다.
from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from server.app import app, get_dns_resolver, get_url_fetcher
from server.url_ingest import (
    FetchedResponse,
    IngestBlockedError,
    UrlIngestConfig,
    fetch_image_bytes,
    ingest_url,
)


class FakeFetcher:
    def __init__(self, responses: dict[str, FetchedResponse]):
        self.responses = responses
        self.requested_urls: list[str] = []

    async def fetch(self, url: str, config: UrlIngestConfig) -> FetchedResponse:
        self.requested_urls.append(url)
        return self.responses[url]


def resolver_for(mapping: dict[str, list[str]]):
    def resolve(hostname: str) -> list[str]:
        return mapping.get(hostname, ["93.184.216.34"])

    return resolve


class UrlIngestServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_non_http_scheme(self):
        fetcher = FakeFetcher({})

        with self.assertRaises(IngestBlockedError) as raised:
            await ingest_url("file:///etc/passwd", fetcher=fetcher, resolver=resolver_for({}))

        self.assertIn("http/https", str(raised.exception))
        self.assertEqual(fetcher.requested_urls, [])

    async def test_blocks_private_ip_before_fetch(self):
        fetcher = FakeFetcher({})

        with self.assertRaises(IngestBlockedError) as raised:
            await ingest_url(
                "https://internal.example/product",
                fetcher=fetcher,
                resolver=resolver_for({"internal.example": ["10.0.0.5"]}),
            )

        self.assertIn("허용되지 않는 네트워크", str(raised.exception))
        self.assertEqual(fetcher.requested_urls, [])

    async def test_follows_safe_redirect_and_returns_image_branch(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=302,
                headers={"location": "https://cdn.example/item.jpg"},
                body=b"",
            ),
            "https://cdn.example/item.jpg": FetchedResponse(
                url="https://cdn.example/item.jpg",
                status_code=200,
                headers={"content-type": "image/jpeg"},
                body=b"fake-image",
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"], "cdn.example": ["93.184.216.35"]}),
        )

        self.assertEqual(result.kind, "image")
        self.assertEqual(result.source_type, "url")
        self.assertEqual(result.source_ref, "https://shop.example/item")
        self.assertEqual(result.final_url, "https://cdn.example/item.jpg")
        self.assertEqual(fetcher.requested_urls, ["https://shop.example/item", "https://cdn.example/item.jpg"])

    async def test_blocks_redirect_to_private_network(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=302,
                headers={"location": "http://127.0.0.1/admin"},
                body=b"",
            ),
        })

        with self.assertRaises(IngestBlockedError):
            await ingest_url(
                "https://shop.example/item",
                fetcher=fetcher,
                resolver=resolver_for({"shop.example": ["93.184.216.34"], "127.0.0.1": ["127.0.0.1"]}),
            )

    async def test_rejects_response_larger_than_limit(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=b"x" * 11,
            ),
        })

        with self.assertRaises(IngestBlockedError) as raised:
            await ingest_url(
                "https://shop.example/item",
                fetcher=fetcher,
                resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
                config=UrlIngestConfig(max_bytes=10),
            )

        self.assertIn("크기", str(raised.exception))

    async def test_extracts_og_image_and_title_from_html(self):
        html_body = b"""
        <html>
          <head>
            <meta property="og:title" content="Summer mute linen shirt">
            <meta property="og:image" content="/images/main.jpg">
          </head>
        </html>
        """
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=html_body,
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
        )

        self.assertEqual(result.kind, "html")
        self.assertEqual(result.next_step, "prepare-image-analysis")
        self.assertEqual(result.representative_image_url, "https://shop.example/images/main.jpg")
        self.assertEqual(result.product_title, "Summer mute linen shirt")
        self.assertEqual(result.parser_strategy, "og-image")
        self.assertEqual(result.bytes_read, len(html_body))

    async def test_falls_back_to_json_ld_product_image(self):
        html_body = b"""
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Muted blue cardigan",
                "image": ["https://cdn.example/product-cardigan.webp"]
              }
            </script>
          </head>
        </html>
        """
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=html_body,
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"], "cdn.example": ["93.184.216.35"]}),
        )

        self.assertEqual(result.representative_image_url, "https://cdn.example/product-cardigan.webp")
        self.assertEqual(result.product_title, "Muted blue cardigan")
        self.assertEqual(result.parser_strategy, "json-ld-product")
        self.assertEqual(result.next_step, "prepare-image-analysis")

    async def test_falls_back_to_largest_image_heuristic(self):
        html_body = b"""
        <html>
          <body>
            <img src="/thumb.jpg" width="160" height="160" alt="thumbnail">
            <img src="/lookbook/main.jpg" width="900" height="1200" alt="Linen jacket">
          </body>
        </html>
        """
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=html_body,
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
        )

        self.assertEqual(result.representative_image_url, "https://shop.example/lookbook/main.jpg")
        self.assertEqual(result.product_title, "Linen jacket")
        self.assertEqual(result.parser_strategy, "largest-image")
        self.assertEqual(result.next_step, "prepare-image-analysis")

    async def test_collects_multiple_candidate_images_from_gallery(self):
        html_body = b"""
        <html>
          <head>
            <meta property="og:image" content="/images/model-wearing.jpg">
            <meta property="og:image" content="/images/flat-lay.jpg">
          </head>
          <body>
            <img src="/icons/badge.png" width="24" height="24" alt="badge">
            <img src="/images/detail-1.jpg" width="900" height="1200" alt="detail">
          </body>
        </html>
        """
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=html_body,
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
        )

        self.assertEqual(result.representative_image_url, "https://shop.example/images/model-wearing.jpg")
        self.assertEqual(
            list(result.candidate_image_urls),
            [
                "https://shop.example/images/model-wearing.jpg",
                "https://shop.example/images/flat-lay.jpg",
                "https://shop.example/images/detail-1.jpg",
            ],
        )
        self.assertNotIn("https://shop.example/icons/badge.png", result.candidate_image_urls)

    async def test_direct_image_response_returns_itself_as_only_candidate(self):
        fetcher = FakeFetcher({
            "https://cdn.example/item.jpg": FetchedResponse(
                url="https://cdn.example/item.jpg",
                status_code=200,
                headers={"content-type": "image/jpeg"},
                body=b"fake-image",
            ),
        })

        result = await ingest_url(
            "https://cdn.example/item.jpg",
            fetcher=fetcher,
            resolver=resolver_for({"cdn.example": ["93.184.216.35"]}),
        )

        self.assertEqual(list(result.candidate_image_urls), ["https://cdn.example/item.jpg"])

    async def test_html_without_image_returns_manual_fallback(self):
        html_body = b"<html><head><meta property='og:title' content='Only title'></head><body></body></html>"
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=html_body,
            ),
        })

        result = await ingest_url(
            "https://shop.example/item",
            fetcher=fetcher,
            resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
        )

        self.assertEqual(result.product_title, "Only title")
        self.assertIsNone(result.representative_image_url)
        self.assertEqual(result.parser_strategy, "none")
        self.assertEqual(result.next_step, "manual-image-url-fallback")


class FetchImageBytesTest(unittest.IsolatedAsyncioTestCase):
    async def test_returns_image_bytes_with_content_type(self):
        fetcher = FakeFetcher({
            "https://cdn.example/item.jpg": FetchedResponse(
                url="https://cdn.example/item.jpg",
                status_code=200,
                headers={"content-type": "image/jpeg"},
                body=b"jpeg-bytes",
            ),
        })

        result = await fetch_image_bytes(
            "https://cdn.example/item.jpg",
            fetcher=fetcher,
            resolver=resolver_for({"cdn.example": ["93.184.216.35"]}),
        )

        self.assertEqual(result.body, b"jpeg-bytes")
        self.assertEqual(result.content_type, "image/jpeg")
        self.assertEqual(result.final_url, "https://cdn.example/item.jpg")

    async def test_rejects_non_image_content_type(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=b"<html></html>",
            ),
        })

        with self.assertRaises(IngestBlockedError) as raised:
            await fetch_image_bytes(
                "https://shop.example/item",
                fetcher=fetcher,
                resolver=resolver_for({"shop.example": ["93.184.216.34"]}),
            )

        self.assertIn("이미지", str(raised.exception))

    async def test_blocks_private_ip_like_ingest_url(self):
        fetcher = FakeFetcher({})

        with self.assertRaises(IngestBlockedError):
            await fetch_image_bytes(
                "https://internal.example/item.jpg",
                fetcher=fetcher,
                resolver=resolver_for({"internal.example": ["192.168.0.10"]}),
            )

        self.assertEqual(fetcher.requested_urls, [])


class UrlIngestRouteTest(unittest.TestCase):
    def tearDown(self):
        app.dependency_overrides.clear()

    def test_health_route_is_available_for_frontend_api_checks(self):
        response = TestClient(app).get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

    def test_legacy_image_routes_are_mounted_for_manual_registration(self):
        paths = {getattr(route, "path", "") for route in app.routes}

        self.assertIn("/api/background/remove", paths)
        self.assertIn("/api/clothing/extract", paths)

    def test_post_ingest_url_uses_dependency_injected_fetcher(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "image/png"},
                body=b"png",
            ),
        })
        app.dependency_overrides[get_url_fetcher] = lambda: fetcher
        app.dependency_overrides[get_dns_resolver] = lambda: resolver_for({"shop.example": ["93.184.216.34"]})

        response = TestClient(app).post("/api/ingest/url", json={"url": "https://shop.example/item"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["kind"], "image")
        self.assertEqual(payload["sourceType"], "url")
        self.assertEqual(payload["sourceRef"], "https://shop.example/item")
        self.assertEqual(payload["representativeImageUrl"], "https://shop.example/item")
        self.assertEqual(payload["parserStrategy"], "direct-image")
        self.assertEqual(payload["candidateImageUrls"], ["https://shop.example/item"])

    def test_post_ingest_image_returns_image_bytes(self):
        fetcher = FakeFetcher({
            "https://cdn.example/item.png": FetchedResponse(
                url="https://cdn.example/item.png",
                status_code=200,
                headers={"content-type": "image/png"},
                body=b"png-bytes",
            ),
        })
        app.dependency_overrides[get_url_fetcher] = lambda: fetcher
        app.dependency_overrides[get_dns_resolver] = lambda: resolver_for({"cdn.example": ["93.184.216.35"]})

        response = TestClient(app).post("/api/ingest/image", json={"url": "https://cdn.example/item.png"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, b"png-bytes")

    def test_post_ingest_image_blocks_html_url(self):
        fetcher = FakeFetcher({
            "https://shop.example/item": FetchedResponse(
                url="https://shop.example/item",
                status_code=200,
                headers={"content-type": "text/html; charset=utf-8"},
                body=b"<html></html>",
            ),
        })
        app.dependency_overrides[get_url_fetcher] = lambda: fetcher
        app.dependency_overrides[get_dns_resolver] = lambda: resolver_for({"shop.example": ["93.184.216.34"]})

        response = TestClient(app).post("/api/ingest/image", json={"url": "https://shop.example/item"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("이미지", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
