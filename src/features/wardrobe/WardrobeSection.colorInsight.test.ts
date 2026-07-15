// 옷장 상세 색상 행이 분석 팝업 진입점으로 연결되는지 소스 계약을 검증합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('WardrobeSection color insight trigger', () => {
  it('의류 카드의 대표 HEX를 클릭 가능한 색상 정보 버튼으로 노출한다', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/wardrobe/WardrobeSection.tsx'), 'utf8');

    expect(source).toContain('ColorInsightModal');
    expect(source).toContain('selectedColorInsightItem');
    expect(source).toContain('색상 정보 보기');
    expect(source).toContain('onOpenColorInsight');
  });
});
