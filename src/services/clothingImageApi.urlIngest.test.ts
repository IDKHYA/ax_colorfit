// URL 수집 프록시를 호출하는 프론트 API 함수 계약을 검증합니다.
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('requestUrlIngest', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('주소를 POST /api/ingest/url로 전달하고 대표 이미지 파싱 결과를 반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: 'html',
        sourceType: 'url',
        sourceRef: 'https://shop.example/item',
        finalUrl: 'https://shop.example/item',
        contentType: 'text/html; charset=utf-8',
        bytesRead: 512,
        nextStep: 'prepare-image-analysis',
        representativeImageUrl: 'https://shop.example/images/main.jpg',
        candidateImageUrls: ['https://shop.example/images/main.jpg', 'https://shop.example/images/detail.jpg'],
        productTitle: '뮤트 블루 린넨 셔츠',
        parserStrategy: 'og-image',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestUrlIngest } = await import('./clothingImageApi');
    const result = await requestUrlIngest('https://shop.example/item');

    expect(fetchMock).toHaveBeenCalledWith('/api/ingest/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://shop.example/item' }),
    });
    expect(result.kind).toBe('html');
    expect(result.nextStep).toBe('prepare-image-analysis');
    expect(result.representativeImageUrl).toBe('https://shop.example/images/main.jpg');
    expect(result.candidateImageUrls).toEqual(['https://shop.example/images/main.jpg', 'https://shop.example/images/detail.jpg']);
    expect(result.productTitle).toBe('뮤트 블루 린넨 셔츠');
    expect(result.parserStrategy).toBe('og-image');
  });

  it('서버가 거부한 주소는 detail 메시지를 포함해 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: '허용되지 않는 네트워크 대상입니다.' }),
    }));

    const { requestUrlIngest } = await import('./clothingImageApi');

    await expect(requestUrlIngest('http://127.0.0.1/admin')).rejects.toThrow('허용되지 않는 네트워크 대상입니다.');
  });
});

describe('requestUrlImageBlob', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('대표 이미지 주소를 POST /api/ingest/image로 보내고 Blob을 반환한다', async () => {
    const imageBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => imageBlob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestUrlImageBlob } = await import('./clothingImageApi');
    const result = await requestUrlImageBlob('https://cdn.example/item.jpg');

    expect(fetchMock).toHaveBeenCalledWith('/api/ingest/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://cdn.example/item.jpg' }),
    });
    expect(result).toBe(imageBlob);
  });

  it('이미지가 아닌 주소는 detail 메시지를 포함해 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: '이미지 주소가 아닙니다.' }),
    }));

    const { requestUrlImageBlob } = await import('./clothingImageApi');

    await expect(requestUrlImageBlob('https://shop.example/item')).rejects.toThrow('이미지 주소가 아닙니다.');
  });
});
