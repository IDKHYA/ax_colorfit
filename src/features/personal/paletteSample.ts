// 24색 팔레트의 앞부분(인덱스 0~1)은 대부분의 시즌에서 흰색/검정에 가까운 공통 무채색 기준색이라,
// 미니 팔레트처럼 일부만 잘라 보여주는 화면에서는 시즌마다 색이 겹쳐 보이는 원인이 된다.
// 이 함수는 그 공통 무채색 구간을 건너뛰고 나머지 구간에서 고르게 샘플링해, 적은 개수로도
// 시즌을 실제로 구분해주는 색상 위주로 보여준다.
export function pickDiversePaletteColors(palette: string[], count: number): string[] {
  if (count <= 0) return [];
  const usable = palette.length > 4 ? palette.slice(2) : palette;
  if (usable.length <= count) return usable.slice(0, count);
  const step = (usable.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => usable[Math.round(i * step)]);
}
