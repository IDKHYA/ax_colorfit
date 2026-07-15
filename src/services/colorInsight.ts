// 의류 대표색을 시즌 스펙트럼과 색채이론 기준의 표시 데이터로 변환합니다.
import { SEASON_PROFILES } from '../personalColorWorkbook';
import { SEASON_AVOID_HEXES, avoidPenaltyForSeason, getSeasonSpectrum, scoreColorForSeason } from '../domain/seasonSpectrum';
import type { SeasonRegion } from '../domain/seasonSpectrum';
import { deltaE2000, hexToHsl, hexToLab, hexToLch, hexToRgb, hueAngleDistance } from '../domain/colorMath';
import type { Lch } from '../domain/colorMath';
import type { PersonalSeasonId } from '../domain/types';
import type { SeasonId } from '../types';
import { SEASON_LABELS } from '../wardrobeConstants';

export interface ColorInsight {
  input: {
    hex: string;
  };
  sourceLabel: string;
  rgb: [number, number, number];
  lab: {
    L: number;
    a: number;
    b: number;
  };
  lch: {
    L: number;
    C: number;
    h: number;
  };
  nearestPalette: {
    hex: string;
    deltaE: number;
  };
  avoid: {
    nearestHex: string | null;
    nearestDeltaE: number | null;
    penalty: number;
  };
  fit: {
    label: string;
    score: number;
    swatchScore: number;
    regionScore: number;
    usedNeutralRule: boolean;
  };
  toneTags: string[];
  colorTheory: {
    harmonyLabel: string;
    hueDistance: number | null;
    note: string;
  };
  spectrum: {
    region: SeasonRegion;
    marker: {
      lightnessPercent: number;
      chromaPercent: number;
      huePercent: number;
    };
    nearestMarker: {
      lightnessPercent: number;
      chromaPercent: number;
    };
    // 배경 그라데이션용 HSL 색상각. 무채색이면 null이고 회색 램프를 쓴다.
    gradientHslHue: number | null;
  };
  palettePreview: string[];
  avoidPreview: string[];
  explanation: string;
}

export function buildColorInsight({
  hex,
  seasonId,
  sourceLabel = '옷장 대표색',
}: {
  hex: string;
  seasonId: SeasonId;
  sourceLabel?: string;
}): ColorInsight {
  const normalizedHex = normalizeHex(hex);
  const domainSeasonId = seasonId as PersonalSeasonId;
  const rgb = hexToRgb(normalizedHex);
  const lab = hexToLab(normalizedHex);
  const lch = hexToLch(normalizedHex);
  const spectrum = getSeasonSpectrum(domainSeasonId);
  const nearestPalette = findNearestHex(normalizedHex, SEASON_PROFILES[seasonId].palette);
  const nearestPaletteLch = hexToLch(nearestPalette.hex);
  const seasonScore = scoreColorForSeason(lab, domainSeasonId);
  const penalty = avoidPenaltyForSeason(lab, domainSeasonId, {
    nearestPaletteDeltaE: seasonScore.nearestDeltaE,
  });
  const avoidNearest = findNearestAvoid(normalizedHex, domainSeasonId);
  const score = clampScore(seasonScore.score + penalty);
  const hueDistance = lch.C < 12 ? null : hueAngleDistance(lch.h, hexToLch(nearestPalette.hex).h);
  const harmonyLabel = harmonyLabelForHueDistance(hueDistance);
  const tags = toneTagsForLch(lch, seasonId);

  return {
    input: { hex: normalizedHex },
    sourceLabel,
    rgb,
    lab: roundLab(lab),
    lch: roundLch(lch),
    nearestPalette: {
      hex: nearestPalette.hex,
      deltaE: round1(nearestPalette.deltaE),
    },
    avoid: {
      nearestHex: avoidNearest?.hex ?? null,
      nearestDeltaE: avoidNearest ? round1(avoidNearest.deltaE) : null,
      penalty,
    },
    fit: {
      label: `${SEASON_LABELS[seasonId]} 적합도`,
      score: Math.round(score),
      swatchScore: Math.round(seasonScore.swatchScore),
      regionScore: Math.round(seasonScore.regionScore),
      usedNeutralRule: seasonScore.usedNeutralRule,
    },
    toneTags: tags,
    colorTheory: {
      harmonyLabel,
      hueDistance: hueDistance == null ? null : Math.round(hueDistance),
      note: colorTheoryNote(harmonyLabel),
    },
    spectrum: {
      region: spectrum.region,
      marker: {
        lightnessPercent: clampPercent(lch.L),
        chromaPercent: clampPercent((lch.C / 110) * 100),
        huePercent: clampPercent((lch.h / 360) * 100),
      },
      nearestMarker: {
        lightnessPercent: clampPercent(nearestPaletteLch.L),
        chromaPercent: clampPercent((nearestPaletteLch.C / 110) * 100),
      },
      gradientHslHue: lch.C < 12 ? null : Math.round(hexToHsl(normalizedHex).h),
    },
    palettePreview: SEASON_PROFILES[seasonId].palette.slice(0, 8),
    avoidPreview: SEASON_AVOID_HEXES[domainSeasonId].slice(0, 5),
    explanation: `${normalizedHex}는 CIEDE2000 기준 최근접 팔레트 색과 ΔE ${round1(nearestPalette.deltaE)} 차이입니다. LCh로 보면 ${tags.join(', ')} 축에 가까워 ${SEASON_LABELS[seasonId]} 해석에 사용됩니다.`,
  };
}

function normalizeHex(hex: string): string {
  const clean = hex.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean.split('').map((char) => char + char).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`;
  return '#000000';
}

function findNearestHex(hex: string, palette: string[]): { hex: string; deltaE: number } {
  const lab = hexToLab(hex);
  return palette.reduce(
    (best, paletteHex) => {
      const deltaE = deltaE2000(lab, hexToLab(paletteHex));
      return deltaE < best.deltaE ? { hex: paletteHex, deltaE } : best;
    },
    { hex: palette[0], deltaE: Number.POSITIVE_INFINITY },
  );
}

function findNearestAvoid(hex: string, seasonId: PersonalSeasonId): { hex: string; deltaE: number } | null {
  const avoidHexes = SEASON_AVOID_HEXES[seasonId] ?? [];
  if (avoidHexes.length === 0) return null;
  return findNearestHex(hex, avoidHexes);
}

function toneTagsForLch(lch: Lch, seasonId: SeasonId): string[] {
  const profile = SEASON_PROFILES[seasonId];
  const tags: string[] = [];

  if (profile.family === 'summer' && lch.C < 35) tags.push('부드러운 쿨톤');
  else if (profile.family === 'winter') tags.push('차가운 대비');
  else if (profile.family === 'spring') tags.push('맑은 웜톤');
  else tags.push('따뜻한 자연톤');

  if (lch.C < 12) tags.push('무채색');
  else if (lch.C < 25) tags.push('저채도');
  else if (lch.C < 45) tags.push('중채도');
  else tags.push('고채도');

  if (lch.L >= 75) tags.push('고명도');
  else if (lch.L >= 55) tags.push('중고명도');
  else if (lch.L >= 35) tags.push('중저명도');
  else tags.push('저명도');

  return tags;
}

function harmonyLabelForHueDistance(distance: number | null): string {
  if (distance == null) return '중립색 보조';
  if (distance <= 20) return '유사색 조화';
  if (distance <= 50) return '인접색 조화';
  if (distance <= 130) return '포인트 배색';
  return '보색 대비';
}

function colorTheoryNote(label: string): string {
  if (label === '유사색 조화') return '가장 가까운 팔레트 스와치와 색상각이 가까워 톤온톤처럼 부드럽게 이어집니다.';
  if (label === '인접색 조화') return '색상환에서 가까운 범위라 통일감이 유지됩니다.';
  if (label === '보색 대비') return '색상각 차이가 커서 선명한 대비가 생깁니다.';
  if (label === '중립색 보조') return '무채색 축은 hue보다 명도와 채도 균형을 우선 봅니다.';
  return '색상각 차이가 있어 포인트 역할을 합니다.';
}

function roundLab(lab: { L: number; a: number; b: number }) {
  return { L: round1(lab.L), a: round1(lab.a), b: round1(lab.b) };
}

function roundLch(lch: Lch) {
  return { L: round1(lch.L), C: round1(lch.C), h: round1(lch.h) };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number): number {
  // 추천 엔진과 같은 바닥 15를 쓴다 — 팝업 점수와 엔진 점수가 다르게 보이지 않게.
  return Math.max(15, Math.min(100, value));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
