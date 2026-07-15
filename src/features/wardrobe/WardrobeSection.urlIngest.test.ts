// 수동 의류 등록 화면에 URL 입력 진입점이 노출되는지 소스 계약을 검증합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('WardrobeSection URL ingest entry', () => {
  it('나만의 옷 추가 화면에 URL로 가져오기 입력 경로를 둔다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');

    expect(source).toContain('URL 가져오기');
    expect(source).toContain('쇼핑몰 상품 주소나 이미지 주소');
    expect(source).toContain('urlImport');
    expect(source).toContain('onAnalyzeUrl');
    expect(source).toContain('주소 분석');
  });

  it('URL 결과 패널이 대표 이미지 파싱 상태를 표시한다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');

    expect(source).toContain('대표 이미지를 찾았습니다.');
    expect(source).toContain('representativeImageUrl');
    expect(source).toContain('productTitle');
    expect(source).toContain('url-ingest-thumbnail');
  });

  it('대표 이미지를 초안으로 넘기는 진입점을 둔다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');

    expect(source).toContain('onAdoptUrlImage');
    expect(source).toContain('이 이미지 분석하기');
    expect(source).toContain('adoptStatus');
  });

  it('URL 초안이 사진 업로드와 같은 자동 분석 경로를 쓴다', () => {
    const source = readFileSync(join(process.cwd(), 'src/hooks/useManualClothing.ts'), 'utf8');

    expect(source).toContain('requestUrlImageBlob');
    expect(source).toContain('autoAnalyzeOnUpload(file)');
    expect(source).toContain("sourceType: 'url'");
  });

  it('대표 이미지 가져오기가 끝나야 사진 업로드 탭으로 전환해 누끼 선택지를 보여준다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');
    const start = source.indexOf('const handleAdoptUrlImage');
    const end = source.indexOf('const sizes =', start);
    if (start === -1) throw new Error('handleAdoptUrlImage 핸들러를 찾지 못했습니다.');
    const handlerBody = source.slice(start, end === -1 ? undefined : end);

    expect(handlerBody).toContain('await props.onAdoptUrlImage()');
    expect(handlerBody).toContain("setInputMode('upload')");
    expect(source).toContain('onClick={handleAdoptUrlImage}');
  });

  it('이미지 가져오기 실패 시에는 URL 탭에 머물러 오류를 보여준다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');
    const start = source.indexOf('const handleAdoptUrlImage');
    const end = source.indexOf('const sizes =', start);
    const handlerBody = source.slice(start, end === -1 ? undefined : end);

    expect(handlerBody).toMatch(/if\s*\(\s*success\s*\)\s*setInputMode\('upload'\)/);
  });
});
