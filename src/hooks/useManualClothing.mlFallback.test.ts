// ML 서비스 장애 시에도 원본 사진과 수동 입력으로 의류 등록이 끝까지 가능한지 회귀 검증합니다(FR-034, FR-042).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function extractFunctionBody(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`marker not found: ${startMarker} / ${endMarker}`);
  return source.slice(start, end);
}

describe('ML 장애 시 수동 등록 완료(FR-034, FR-042)', () => {
  const hookSource = readFileSync(join(process.cwd(), 'src/hooks/useManualClothing.ts'), 'utf8');

  it('사진을 선택하면 자동 분석 성공 여부와 무관하게 원본 미리보기(imageUrl/originalImageUrl)를 즉시 반영한다', () => {
    const handleFileChangeBody = extractFunctionBody(hookSource, 'const handleFileChange', 'const removeManualBackground');
    expect(handleFileChangeBody).toContain('imageUrl: objectUrl, originalImageUrl: objectUrl');
    expect(handleFileChangeBody.indexOf('setManual')).toBeLessThan(handleFileChangeBody.indexOf('autoAnalyzeOnUpload'));
  });

  it('자동 분석 실패는 오류 상태만 남기고 이미 반영된 원본 이미지 필드를 지우지 않는다', () => {
    const autoAnalyzeBody = extractFunctionBody(hookSource, 'const autoAnalyzeOnUpload', 'const handleFileChange');
    const catchBlock = autoAnalyzeBody.slice(autoAnalyzeBody.indexOf('} catch (error) {'));
    expect(catchBlock).not.toContain('imageUrl:');
    expect(catchBlock).not.toContain('originalImageUrl:');
    expect(catchBlock).toContain('setBackgroundRemoveError');
  });

  it('의류 저장 버튼은 원본 이미지 존재 여부만으로 활성화되고 AI 분석 성공 여부에 의존하지 않는다', () => {
    const wardrobeSectionSource = readFileSync(
      join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'),
      'utf8',
    );
    const saveButtonLine = wardrobeSectionSource
      .split('\n')
      .find((line) => line.includes('onSaveManual') && line.includes('disabled'));

    expect(saveButtonLine).toBeDefined();
    expect(saveButtonLine).toContain('disabled={!props.manual.imageUrl}');
    expect(saveButtonLine).not.toContain('aiAnalyzed');
    expect(saveButtonLine).not.toContain('backgroundRemoveStatus');
  });
});
