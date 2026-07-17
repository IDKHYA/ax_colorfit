// 시즌 리퀴드 글래스 배경 생성기: 시즌별 색을 쓰고, 미측정이면 색을 지어내지 않으며,
// 같은 시드는 재현되고 다른 시드는 다른 배치를 준다는 것을 검증합니다.
import { describe, expect, it } from 'vitest';
import { buildSeasonGlassBackground } from './seasonGlass';
import { SEASON_DISPLAY } from './seasonDisplay';

describe('buildSeasonGlassBackground', () => {
  it('시즌이 없으면(미측정) null을 반환한다 — 없는 색을 지어내지 않는다', () => {
    expect(buildSeasonGlassBackground(null, 12345)).toBeNull();
  });

  it('시즌이 있으면 radial-gradient 블롭을 포함한 background 문자열을 만든다', () => {
    const bg = buildSeasonGlassBackground('dark-autumn', 42);
    expect(bg).toBeTypeOf('string');
    expect(bg).toContain('radial-gradient');
    // 4개 색 블롭 + 유리 하이라이트 1개
    expect((bg as string).match(/radial-gradient/g)?.length).toBe(4);
    expect(bg).toContain('linear-gradient');
  });

  it('같은 (시즌, 시드)는 동일한 결과를 재현한다', () => {
    expect(buildSeasonGlassBackground('true-winter', 7)).toBe(buildSeasonGlassBackground('true-winter', 7));
  });

  it('시드가 다르면 배치가 달라진다 — 고정된 느낌을 없앤다', () => {
    const a = buildSeasonGlassBackground('true-winter', 1);
    const b = buildSeasonGlassBackground('true-winter', 999);
    expect(a).not.toBe(b);
  });

  it('뽑은 색은 해당 시즌 팔레트 안의 색이다', () => {
    const palette = SEASON_DISPLAY['light-spring'].palette.map((h) => h.toUpperCase());
    const bg = buildSeasonGlassBackground('light-spring', 555) as string;
    const rgbTriples = [...bg.matchAll(/rgba\((\d+),(\d+),(\d+),/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    const paletteRgb = new Set(
      palette.map((hex) => {
        const int = parseInt(hex.replace('#', ''), 16);
        return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
      }),
    );
    // 흰색 하이라이트(255,255,255)를 제외한 색 블롭은 전부 팔레트 색이어야 한다.
    const colorBlobs = rgbTriples.filter(([r, g, b]) => !(r === 255 && g === 255 && b === 255));
    expect(colorBlobs.length).toBeGreaterThan(0);
    for (const [r, g, b] of colorBlobs) {
      expect(paletteRgb.has(`${r},${g},${b}`)).toBe(true);
    }
  });
});
