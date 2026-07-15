// 색상 분석 팝업 레이어가 계산 결과를 화면 문구로 렌더링하는지 검증합니다.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildColorInsight } from '../../services/colorInsight';
import { ColorInsightModal } from './ColorInsightModal';

describe('ColorInsightModal', () => {
  it('옷장 색상 분석에 필요한 계산 블록과 스펙트럼을 보여준다', () => {
    const insight = buildColorInsight({ hex: '#8FA6B8', seasonId: 'soft-summer' });
    const html = renderToStaticMarkup(
      <ColorInsightModal
        insight={insight}
        itemName="더스티 블루 셔츠"
        dominantHexes={['#8FA6B8', '#B8A8D4']}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain('색상 분석');
    expect(html).toContain('HEX → CIELAB/LCh');
    expect(html).toContain('CIEDE2000');
    expect(html).toContain('색채이론');
    expect(html).toContain('LCh 스펙트럼');
    expect(html).toContain('더스티 블루 셔츠');
    expect(html).toContain('소프트 서머 적합도');
    expect(html).toContain('부드러운 쿨톤');
    expect(html).toContain('color-insight-overlay');
    expect(html).toContain('liquid-color-orb');
    expect(html).toContain('color-companion');
    expect(html).not.toContain('URL·사진 분석 완료 화면에서도 재사용');
  });

  it('스펙트럼 범례와 좌표 마커를 렌더링한다', () => {
    const insight = buildColorInsight({ hex: '#8FA6B8', seasonId: 'soft-summer' });
    const html = renderToStaticMarkup(
      <ColorInsightModal
        insight={insight}
        itemName="더스티 블루 셔츠"
        dominantHexes={['#8FA6B8']}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain('spectrum-legend');
    expect(html).toContain('현재 색');
    expect(html).toContain('최근접 팔레트');
    expect(html).toContain('시즌 영역');
    expect(html).toContain('고명도');
    expect(html).toContain('저명도');
    // 최근접 팔레트 마커가 좌표 스타일을 갖는다 (우하단 고정이 아니라).
    expect(html).toContain(`최근접 팔레트 ${insight.nearestPalette.hex}`);
  });
});
