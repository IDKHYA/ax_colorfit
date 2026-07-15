// 누끼·정밀 누끼 API 오류가 서버 detail 안내 문구를 그대로 전달하는지 검증합니다.
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('누끼 API 오류 안내 계약', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('누끼 API가 503 detail을 주면 그 안내 문구로 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: '이 배포에는 AI 이미지 분석 서버가 포함되어 있지 않습니다. 색상과 분류를 직접 입력해 주세요.' }),
    }));

    const { requestBackgroundRemoval } = await import('./clothingImageApi');

    await expect(requestBackgroundRemoval(new Blob(['x']))).rejects.toThrow('직접 입력');
  });

  it('정밀 누끼 API가 detail 없이 실패하면 상태 코드 기본 문구로 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('no json body');
      },
    }));

    const { requestPrecisionExtraction } = await import('./clothingImageApi');

    await expect(requestPrecisionExtraction(new Blob(['x']), 'auto')).rejects.toThrow('정밀 누끼 API 오류: 500');
  });
});
