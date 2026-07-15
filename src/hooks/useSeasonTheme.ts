// 퍼컬 결과의 시즌 표시 팔레트를 전역 CSS 변수(--season-1~4, --season-deep)로 주입해 ColorFit 테마를 시즌색으로 물들이는 훅입니다.
import { useEffect } from 'react';
import { SEASON_DISPLAY } from '../features/personal/seasonDisplay';
import type { FinalResult } from '../types';

// 프로토타입 applySeason()의 인덱스 규약을 그대로 따른다 — 24색 팔레트에서 [0],[4],[17],[21]을 테마 4색으로, [3]을 딥 톤으로 쓴다.
export function seasonThemeColors(seasonId: FinalResult['seasonTop1Id'] | null) {
  const palette = seasonId ? SEASON_DISPLAY[seasonId]?.palette : null;
  if (!palette) {
    // colorfit.css :root 기본값(라이트 스프링)과 동일한 값 — 미측정 상태의 기본 테마.
    return { s1: '#FFF6D9', s2: '#FFD1B8', s3: '#73D7D3', s4: '#FF8F70', deep: '#8a5f40' };
  }
  return {
    s1: palette[0],
    s2: palette[4] ?? palette[1],
    s3: palette[17] ?? palette[12],
    s4: palette[21] ?? palette[7],
    deep: palette[3] ?? '#49515c',
  };
}

export function useSeasonTheme(result: FinalResult | null) {
  useEffect(() => {
    const colors = seasonThemeColors(result?.seasonTop1Id ?? null);
    const root = document.documentElement;
    root.style.setProperty('--season-1', colors.s1);
    root.style.setProperty('--season-2', colors.s2);
    root.style.setProperty('--season-3', colors.s3);
    root.style.setProperty('--season-4', colors.s4);
    root.style.setProperty('--season-deep', colors.deep);
  }, [result]);
}
