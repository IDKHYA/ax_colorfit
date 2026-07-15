// ML API 기준 URL을 환경변수 경계로 받는지 검증합니다(FR-042).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ML API 기준 URL 환경변수 경계(FR-042)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('VITE_ML_API_BASE_URL이 없으면 기존과 동일하게 같은 출처 상대 경로를 쓴다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackgroundRemoval } = await import('./clothingImageApi');
    await requestBackgroundRemoval(new Blob(['x']));

    expect(fetchMock).toHaveBeenCalledWith('/api/background/remove', expect.anything());
  });

  it('VITE_ML_API_BASE_URL이 있으면 해당 기준 URL로 ML 요청을 보낸다', async () => {
    vi.stubEnv('VITE_ML_API_BASE_URL', 'https://ml.example.com');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { requestBackgroundRemoval, requestPrecisionExtraction, getApiHealth } = await import('./clothingImageApi');

    await requestBackgroundRemoval(new Blob(['x']));
    expect(fetchMock).toHaveBeenCalledWith('https://ml.example.com/api/background/remove', expect.anything());

    await requestPrecisionExtraction(new Blob(['x']), 'auto');
    expect(fetchMock).toHaveBeenCalledWith('https://ml.example.com/api/clothing/extract', expect.anything());

    await getApiHealth();
    expect(fetchMock).toHaveBeenCalledWith('https://ml.example.com/api/health', expect.anything());
  });

  it('URL/이미지 수집 호출은 ML 기준 URL 경계 대상이 아니며 항상 같은 출처를 쓴다', async () => {
    vi.stubEnv('VITE_ML_API_BASE_URL', 'https://ml.example.com');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), blob: async () => new Blob() });
    vi.stubGlobal('fetch', fetchMock);

    const { requestUrlIngest, requestUrlImageBlob } = await import('./clothingImageApi');

    await requestUrlIngest('https://shop.example.com/product/1');
    expect(fetchMock).toHaveBeenCalledWith('/api/ingest/url', expect.anything());

    await requestUrlImageBlob('https://shop.example.com/image.jpg');
    expect(fetchMock).toHaveBeenCalledWith('/api/ingest/image', expect.anything());
  });
});
