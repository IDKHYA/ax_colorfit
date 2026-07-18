// 퍼컬 결과 저장 이미지 파일명 규칙: 퍼컬결과_시즌명_user_YYYYMMDD_HHmm.png
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function buildShareFileName(seasonKo: string, now: Date): string {
  const seasonSlug = seasonKo.replace(/\s+/g, '');
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  return `퍼컬결과_${seasonSlug}_user_${stamp}.png`;
}
