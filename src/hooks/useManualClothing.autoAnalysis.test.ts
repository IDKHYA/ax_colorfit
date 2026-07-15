// 등록 시 자동 분석이 원본 사진을 유지하고 색상만 자동 반영하는지 소스 계약으로 검증합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function extractFunctionBody(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`marker not found: ${startMarker} / ${endMarker}`);
  return source.slice(start, end);
}

describe('useManualClothing 자동 분석 범위', () => {
  const source = readFileSync(join(process.cwd(), 'src/hooks/useManualClothing.ts'), 'utf8');
  const autoAnalyzeBody = extractFunctionBody(source, 'const autoAnalyzeOnUpload', 'const handleFileChange');

  it('등록 시 자동 분석은 원본 사진(imageUrl/cutoutImageUrl)을 덮어쓰지 않는다', () => {
    expect(autoAnalyzeBody).not.toContain('imageUrl: result.imageDataUrl');
    expect(autoAnalyzeBody).not.toContain('cutoutImageUrl: result.imageDataUrl');
  });

  it('등록 시 색상과 분류는 무조건 자동으로 반영한다', () => {
    expect(autoAnalyzeBody).toContain('color: detectedColor?.hex');
    expect(autoAnalyzeBody).toContain('colors: result.colors');
    expect(autoAnalyzeBody).toContain('aiAnalyzed: true');
  });

  it('누끼 따기/정밀 누끼 버튼은 여전히 원본 이미지를 실제 컷아웃으로 바꾼다(선택권 유지)', () => {
    const removeBackgroundBody = extractFunctionBody(source, 'const removeManualBackground', 'const extractManualClothingPrecisely');
    const precisionExtractBody = extractFunctionBody(source, 'const extractManualClothingPrecisely', 'const handleManualCategory');

    expect(removeBackgroundBody).toContain('imageUrl: result.imageDataUrl');
    expect(precisionExtractBody).toContain('imageUrl: result.imageDataUrl');
  });
});
