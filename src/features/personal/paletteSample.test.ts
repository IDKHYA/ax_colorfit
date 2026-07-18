// 미니 팔레트가 시즌마다 겹쳐 보이던 문제(앞 2칸이 거의 모든 시즌에서 흰색/검정 계열)를
// 대표색 샘플링으로 고쳤는지 확인합니다.
import { describe, expect, it } from 'vitest';
import { pickDiversePaletteColors } from './paletteSample';
import { SEASON_PROFILES } from '../../personalColorWorkbook';

describe('pickDiversePaletteColors', () => {
  it('요청한 개수만큼 색을 반환한다', () => {
    expect(pickDiversePaletteColors(SEASON_PROFILES['light-spring'].palette, 5)).toHaveLength(5);
  });

  it('공통 무채색 구간(인덱스 0~1)을 건너뛴다', () => {
    const picked = pickDiversePaletteColors(SEASON_PROFILES['true-winter'].palette, 5);
    expect(picked).not.toContain('#FFFFFF');
    expect(picked).not.toContain('#000000');
  });

  it('트루 윈터와 브라이트 윈터처럼 앞부분이 같은 시즌도 서로 다른 대표색을 뽑는다', () => {
    const trueWinter = pickDiversePaletteColors(SEASON_PROFILES['true-winter'].palette, 5);
    const brightWinter = pickDiversePaletteColors(SEASON_PROFILES['bright-winter'].palette, 5);
    expect(trueWinter).not.toEqual(brightWinter);
  });

  it('팔레트보다 요청 개수가 많으면 있는 만큼만 반환한다', () => {
    expect(pickDiversePaletteColors(['#111111', '#222222'], 5)).toEqual(['#111111', '#222222']);
  });
});
