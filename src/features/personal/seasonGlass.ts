// 판정 시즌의 24색 팔레트에서 매 방문마다 랜덤하게 4색·랜덤 위치를 뽑아 리퀴드 글래스 배경을
// 만듭니다. 고정 인덱스(useSeasonTheme의 [0],[4],[17],[21])와 달리 "그때그때 다른" 느낌을 준다.
import { SEASON_DISPLAY } from './seasonDisplay';
import type { SeasonId } from '../../types';

// 재현 가능한 시드 기반 난수(mulberry32). 같은 (seasonId, seed)면 같은 배치가 나와
// 한 번 방문하는 동안엔 안정적이고, 다시 들어오면(seed 변경) 새 배치가 된다.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function pickDistinct<T>(items: T[], count: number, rand: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// 시즌이 없으면(미측정) null을 반환해, 없는 색을 지어내지 않고 중립 유리를 쓰게 한다.
export function buildSeasonGlassBackground(seasonId: SeasonId | null, seed: number): string | null {
  if (!seasonId) return null;
  const palette = SEASON_DISPLAY[seasonId]?.palette;
  if (!palette || palette.length === 0) return null;

  const rand = mulberry32(seed);
  const colors = pickDistinct(palette, 4, rand);

  const blobs = colors.map((hex) => {
    const [r, g, b] = hexToRgb(hex);
    const x = Math.round(8 + rand() * 84); // 8~92%
    const y = Math.round(6 + rand() * 84); // 6~90%
    const reach = Math.round(34 + rand() * 22); // 34~56%
    const alpha = (0.42 + rand() * 0.22).toFixed(2); // 0.42~0.64
    return `radial-gradient(circle at ${x}% ${y}%, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},0) ${reach}%)`;
  });

  // 은은한 유리 하이라이트를 맨 위에 얹는다.
  blobs.push('linear-gradient(125deg, rgba(255,255,255,.22), transparent 34%, rgba(255,255,255,.10) 52%, transparent 74%)');

  return blobs.join(', ');
}
