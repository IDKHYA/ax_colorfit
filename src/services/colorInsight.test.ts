// 의류 대표색을 시즌 스펙트럼 기준 분석 결과로 바꾸는 서비스를 검증합니다.
import { describe, expect, it } from 'vitest';
import { buildColorInsight } from './colorInsight';

describe('buildColorInsight', () => {
  it('여름뮤트 대표 의류색의 CIELAB/LCh, CIEDE2000, 시즌 점수 요약을 만든다', () => {
    const insight = buildColorInsight({ hex: '#8FA6B8', seasonId: 'soft-summer' });

    expect(insight.input.hex).toBe('#8FA6B8');
    expect(insight.rgb).toEqual([143, 166, 184]);
    expect(insight.lab.L).toBeGreaterThan(60);
    expect(insight.lab.L).toBeLessThan(75);
    expect(insight.lch.C).toBeLessThan(25);
    expect(insight.lch.h).toBeGreaterThan(220);
    expect(insight.lch.h).toBeLessThan(270);
    expect(insight.nearestPalette.deltaE).toBeGreaterThanOrEqual(0);
    expect(insight.nearestPalette.deltaE).toBeLessThan(12);
    expect(insight.fit.score).toBeGreaterThanOrEqual(80);
    expect(insight.fit.label).toBe('소프트 서머 적합도');
    expect(insight.toneTags).toEqual(expect.arrayContaining(['부드러운 쿨톤', '저채도', '중고명도']));
    expect(insight.colorTheory.harmonyLabel).toBe('유사색 조화');
    expect(insight.spectrum.region.lRange[0]).toBeLessThan(insight.spectrum.region.lRange[1]);
  });

  it('회피색 결정 경계와 분석 출처 메모를 함께 제공한다', () => {
    const insight = buildColorInsight({ hex: '#C7474C', seasonId: 'soft-summer', sourceLabel: 'URL 분석 완료 화면' });

    expect(insight.sourceLabel).toBe('URL 분석 완료 화면');
    expect(insight.avoid.nearestDeltaE).toBeGreaterThanOrEqual(0);
    expect(insight.avoid.penalty).toBeLessThanOrEqual(0);
    expect(insight.explanation).toContain('CIEDE2000');
    expect(insight.explanation).toContain('LCh');
  });

  it('스펙트럼에 최근접 팔레트 좌표와 배경 hue를 제공한다', () => {
    const chromatic = buildColorInsight({ hex: '#C7474C', seasonId: 'soft-summer' });
    expect(chromatic.spectrum.nearestMarker.lightnessPercent).toBeGreaterThan(0);
    expect(chromatic.spectrum.nearestMarker.chromaPercent).toBeGreaterThan(0);
    expect(chromatic.spectrum.gradientHslHue).not.toBeNull();

    // 무채색은 hue가 무의미하므로 배경 hue가 null이어야 한다.
    const neutral = buildColorInsight({ hex: '#747366', seasonId: 'soft-summer' });
    expect(neutral.spectrum.gradientHslHue).toBeNull();
  });

  it('적합도 점수는 추천 엔진과 같은 바닥 15를 쓴다', () => {
    // #FF0000은 여름 뮤트 회피색 자체라 -15 감점을 받아도 15 아래로 내려가지 않는다.
    const insight = buildColorInsight({ hex: '#FF0000', seasonId: 'soft-summer' });
    expect(insight.avoid.penalty).toBe(-15);
    expect(insight.fit.score).toBeGreaterThanOrEqual(15);
  });
});
