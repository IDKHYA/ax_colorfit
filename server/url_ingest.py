# 외부 상품 URL을 안전하게 가져오고 HTML 상품 페이지에서 대표 이미지와 상품명을 파싱합니다.
from __future__ import annotations

import ipaddress
import json
import socket
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any, Callable, Literal, Protocol
from urllib.parse import urljoin, urlparse

import httpx


DnsResolver = Callable[[str], list[str]]
IngestKind = Literal["image", "html"]
ParserStrategy = Literal["direct-image", "og-image", "json-ld-product", "largest-image", "none"]


class IngestError(Exception):
    """URL 수집 도중 사용자에게 안내할 수 있는 실패를 표현합니다."""


class IngestBlockedError(IngestError):
    """보안 정책 또는 입력 제한 때문에 URL 수집을 차단했음을 표현합니다."""


@dataclass(frozen=True)
class UrlIngestConfig:
    max_bytes: int = 8 * 1024 * 1024
    max_redirects: int = 4
    timeout_seconds: float = 8.0


@dataclass(frozen=True)
class FetchedResponse:
    url: str
    status_code: int
    headers: dict[str, str]
    body: bytes


@dataclass(frozen=True)
class UrlIngestResult:
    kind: IngestKind
    source_type: Literal["url"]
    source_ref: str
    final_url: str
    content_type: str
    bytes_read: int
    next_step: str
    representative_image_url: str | None
    product_title: str | None
    parser_strategy: ParserStrategy

    def to_api_payload(self) -> dict[str, str | int | None]:
        return {
            "kind": self.kind,
            "sourceType": self.source_type,
            "sourceRef": self.source_ref,
            "finalUrl": self.final_url,
            "contentType": self.content_type,
            "bytesRead": self.bytes_read,
            "nextStep": self.next_step,
            "representativeImageUrl": self.representative_image_url,
            "productTitle": self.product_title,
            "parserStrategy": self.parser_strategy,
        }


@dataclass(frozen=True)
class ParsedProductPage:
    representative_image_url: str | None
    product_title: str | None
    parser_strategy: ParserStrategy


@dataclass(frozen=True)
class UrlImageResult:
    body: bytes
    content_type: str
    final_url: str


class UrlFetcher(Protocol):
    async def fetch(self, url: str, config: UrlIngestConfig) -> FetchedResponse:
        """리다이렉트는 따라가지 않고 단일 URL 응답만 가져옵니다."""


class HttpxUrlFetcher:
    async def fetch(self, url: str, config: UrlIngestConfig) -> FetchedResponse:
        headers = {
            "accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8",
            "user-agent": "personal-color-wardrobe-v2-url-ingest/0.1",
        }
        async with httpx.AsyncClient(follow_redirects=False, timeout=config.timeout_seconds) as client:
            async with client.stream("GET", url, headers=headers) as response:
                content_length = response.headers.get("content-length")
                if content_length and _safe_int(content_length) > config.max_bytes:
                    raise IngestBlockedError("응답 크기가 제한을 초과했습니다.")

                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > config.max_bytes:
                        raise IngestBlockedError("응답 크기가 제한을 초과했습니다.")
                    chunks.append(chunk)

                return FetchedResponse(
                    url=str(response.url),
                    status_code=response.status_code,
                    headers={key.lower(): value for key, value in response.headers.items()},
                    body=b"".join(chunks),
                )


async def _fetch_following_redirects(
    url: str,
    *,
    fetcher: UrlFetcher,
    resolver: DnsResolver,
    config: UrlIngestConfig,
) -> FetchedResponse:
    current_url = url

    for redirect_count in range(config.max_redirects + 1):
        _validate_public_http_url(current_url, resolver)
        response = await fetcher.fetch(current_url, config)

        if _is_redirect(response.status_code):
            if redirect_count >= config.max_redirects:
                raise IngestBlockedError("리다이렉트 횟수가 제한을 초과했습니다.")
            location = _header(response.headers, "location")
            if not location:
                raise IngestError("리다이렉트 응답에 Location 헤더가 없습니다.")
            current_url = urljoin(current_url, location)
            continue

        if response.status_code >= 400:
            raise IngestError(f"원격 서버가 {response.status_code} 상태를 반환했습니다.")
        if len(response.body) > config.max_bytes:
            raise IngestBlockedError("응답 크기가 제한을 초과했습니다.")

        return response

    raise IngestBlockedError("리다이렉트 횟수가 제한을 초과했습니다.")


async def ingest_url(
    url: str,
    *,
    fetcher: UrlFetcher,
    resolver: DnsResolver,
    config: UrlIngestConfig | None = None,
) -> UrlIngestResult:
    active_config = config or UrlIngestConfig()
    source_ref = url.strip()
    response = await _fetch_following_redirects(source_ref, fetcher=fetcher, resolver=resolver, config=active_config)

    content_type = _header(response.headers, "content-type") or "application/octet-stream"
    media_type = content_type.split(";", 1)[0].strip().lower()

    if media_type.startswith("image/"):
        return UrlIngestResult(
            kind="image",
            source_type="url",
            source_ref=source_ref,
            final_url=response.url,
            content_type=content_type,
            bytes_read=len(response.body),
            next_step="prepare-image-analysis",
            representative_image_url=response.url,
            product_title=None,
            parser_strategy="direct-image",
        )

    if media_type in {"text/html", "application/xhtml+xml"}:
        parsed = parse_product_page(_decode_html_body(response.body, content_type), response.url)
        return UrlIngestResult(
            kind="html",
            source_type="url",
            source_ref=source_ref,
            final_url=response.url,
            content_type=content_type,
            bytes_read=len(response.body),
            next_step="prepare-image-analysis" if parsed.representative_image_url else "manual-image-url-fallback",
            representative_image_url=parsed.representative_image_url,
            product_title=parsed.product_title,
            parser_strategy=parsed.parser_strategy,
        )

    raise IngestBlockedError("지원하지 않는 Content-Type입니다.")


async def fetch_image_bytes(
    url: str,
    *,
    fetcher: UrlFetcher,
    resolver: DnsResolver,
    config: UrlIngestConfig | None = None,
) -> UrlImageResult:
    """대표 이미지 다운로드 프록시. 브라우저 CORS 제한을 대신 처리하며 이미지 응답만 허용합니다."""
    active_config = config or UrlIngestConfig()
    response = await _fetch_following_redirects(url.strip(), fetcher=fetcher, resolver=resolver, config=active_config)

    content_type = _header(response.headers, "content-type") or "application/octet-stream"
    media_type = content_type.split(";", 1)[0].strip().lower()
    if not media_type.startswith("image/"):
        raise IngestBlockedError("이미지 주소가 아닙니다.")

    return UrlImageResult(body=response.body, content_type=content_type, final_url=response.url)


def resolve_hostname(hostname: str) -> list[str]:
    return sorted({info[4][0] for info in socket.getaddrinfo(hostname, None)})


def _validate_public_http_url(url: str, resolver: DnsResolver) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise IngestBlockedError("URL은 http/https만 허용됩니다.")
    if not parsed.hostname:
        raise IngestBlockedError("호스트가 없는 URL은 허용되지 않습니다.")

    hostname = parsed.hostname.lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise IngestBlockedError("허용되지 않는 네트워크 대상입니다.")

    addresses = _addresses_for_hostname(hostname, resolver)
    if not addresses:
        raise IngestBlockedError("호스트 주소를 확인할 수 없습니다.")

    # SSRF 방지를 위해 요청 전 DNS 해석 결과 전체를 검사하고, 리다이렉트 대상에도 같은 검사를 반복합니다.
    for address in addresses:
        if _is_blocked_ip(address):
            raise IngestBlockedError("허용되지 않는 네트워크 대상입니다.")


def _addresses_for_hostname(hostname: str, resolver: DnsResolver) -> list[str]:
    try:
        ipaddress.ip_address(hostname)
        return [hostname]
    except ValueError:
        return resolver(hostname)


def _is_blocked_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return any((
        ip.is_private,
        ip.is_loopback,
        ip.is_link_local,
        ip.is_multicast,
        ip.is_reserved,
        ip.is_unspecified,
    ))


class _ProductHtmlParser(HTMLParser):
    """og 메타, JSON-LD 스크립트, img 태그만 수집하는 최소 파서입니다."""

    def __init__(self) -> None:
        super().__init__()
        self.og_image: str | None = None
        self.og_title: str | None = None
        self.json_ld_chunks: list[str] = []
        self.images: list[dict[str, str]] = []
        self._in_json_ld = False
        self._json_ld_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: (value or "") for key, value in attrs}
        if tag == "meta":
            prop = (attr_map.get("property") or attr_map.get("name") or "").lower()
            content = attr_map.get("content", "").strip()
            if prop == "og:image" and content and not self.og_image:
                self.og_image = content
            elif prop == "og:title" and content and not self.og_title:
                self.og_title = content
        elif tag == "img":
            src = attr_map.get("src", "").strip()
            if src:
                self.images.append({
                    "src": src,
                    "width": attr_map.get("width", ""),
                    "height": attr_map.get("height", ""),
                    "alt": attr_map.get("alt", "").strip(),
                })
        elif tag == "script" and attr_map.get("type", "").strip().lower() == "application/ld+json":
            self._in_json_ld = True
            self._json_ld_buffer = []

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._json_ld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self._in_json_ld = False
            chunk = "".join(self._json_ld_buffer).strip()
            if chunk:
                self.json_ld_chunks.append(chunk)


def parse_product_page(html_text: str, base_url: str) -> ParsedProductPage:
    """og:image → JSON-LD Product → 최대 이미지 휴리스틱 순서로 대표 이미지를 찾습니다."""
    parser = _ProductHtmlParser()
    parser.feed(html_text)
    parser.close()

    json_ld_image, json_ld_name = _find_json_ld_product(parser.json_ld_chunks)

    image_url: str | None = None
    image_alt: str | None = None
    strategy: ParserStrategy = "none"
    if parser.og_image:
        image_url = parser.og_image
        strategy = "og-image"
    elif json_ld_image:
        image_url = json_ld_image
        strategy = "json-ld-product"
    else:
        largest = _largest_image(parser.images)
        if largest:
            image_url = largest["src"]
            image_alt = largest["alt"] or None
            strategy = "largest-image"

    return ParsedProductPage(
        representative_image_url=urljoin(base_url, image_url) if image_url else None,
        product_title=parser.og_title or json_ld_name or image_alt,
        parser_strategy=strategy,
    )


def _find_json_ld_product(chunks: list[str]) -> tuple[str | None, str | None]:
    for chunk in chunks:
        try:
            data = json.loads(chunk)
        except ValueError:
            continue
        product = _find_product_node(data)
        if not product:
            continue
        image = product.get("image")
        if isinstance(image, list):
            image = next((item for item in image if isinstance(item, str) and item.strip()), None)
        if isinstance(image, dict):
            image = image.get("url")
        name = product.get("name")
        image_text = image.strip() if isinstance(image, str) and image.strip() else None
        name_text = name.strip() if isinstance(name, str) and name.strip() else None
        if image_text or name_text:
            return image_text, name_text
    return None, None


def _find_product_node(node: Any) -> dict[str, Any] | None:
    if isinstance(node, dict):
        node_type = node.get("@type")
        types = node_type if isinstance(node_type, list) else [node_type]
        if "Product" in types:
            return node
        for value in node.values():
            found = _find_product_node(value)
            if found:
                return found
    if isinstance(node, list):
        for item in node:
            found = _find_product_node(item)
            if found:
                return found
    return None


def _largest_image(images: list[dict[str, str]]) -> dict[str, str] | None:
    best: dict[str, str] | None = None
    best_area = 0
    for image in images:
        area = _dimension(image["width"]) * _dimension(image["height"])
        if area > best_area:
            best_area = area
            best = image
    return best


def _dimension(value: str) -> int:
    digits = "".join(ch for ch in value if ch.isdigit())
    return int(digits) if digits else 0


def _decode_html_body(body: bytes, content_type: str) -> str:
    charset = "utf-8"
    for part in content_type.split(";")[1:]:
        key, _, value = part.partition("=")
        if key.strip().lower() == "charset" and value.strip():
            charset = value.strip().strip("\"'")
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def _header(headers: dict[str, str], key: str) -> str | None:
    target = key.lower()
    for header_key, value in headers.items():
        if header_key.lower() == target:
            return value
    return None


def _is_redirect(status_code: int) -> bool:
    return status_code in {301, 302, 303, 307, 308}


def _safe_int(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return 0
