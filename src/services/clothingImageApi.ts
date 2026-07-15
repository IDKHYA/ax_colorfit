// 의류 이미지 업로드 전처리와 배경 제거 API 호출을 담당합니다.
import type { BackgroundRemoveResult } from '../wardrobeTypes';

// ML(누끼·정밀 추출) API 기준 URL 경계(FR-042). 미설정 시 기존과 동일한 같은 출처 상대 경로를 쓴다.
// URL/이미지 수집(/api/ingest/*)은 Vercel 경량 API 책임이라 이 경계 대상이 아니다.
function mlApiUrl(path: string): string {
  const base = import.meta.env.VITE_ML_API_BASE_URL;
  return base ? `${base}${path}` : path;
}

export interface UrlIngestApiResult {
  kind: 'image' | 'html';
  sourceType: 'url';
  sourceRef: string;
  finalUrl: string;
  contentType: string;
  bytesRead: number;
  nextStep: 'prepare-image-analysis' | 'manual-image-url-fallback';
  representativeImageUrl: string | null;
  productTitle: string | null;
  parserStrategy: 'direct-image' | 'og-image' | 'json-ld-product' | 'largest-image' | 'none';
}

export async function resizeImageFileForUpload(file: File, maxSide = 1280) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.9);
  });
}

export async function imageUrlToUploadBlob(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다: ${response.status}`);
  return response.blob();
}

// 누끼/분석 API 서버가 떠 있는지 빠르게 확인합니다(타임아웃 포함).
// 분석 실패 시 "서버 꺼짐"과 "분석 실패"를 구분해 사용자에게 명확히 안내하기 위한 용도입니다.
export async function getApiHealth(timeoutMs = 2500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(mlApiUrl('/api/health'), { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

export async function requestBackgroundRemoval(blob: Blob, fileName = 'clothing.jpg') {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  const response = await fetch(mlApiUrl('/api/background/remove'), { method: 'POST', body: formData });
  if (!response.ok) throw new Error((await readErrorDetail(response)) || `누끼 API 오류: ${response.status}`);
  return response.json() as Promise<BackgroundRemoveResult>;
}

export async function requestPrecisionExtraction(blob: Blob, targetPart: string, fileName = 'clothing.jpg') {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('targetPart', targetPart);
  const response = await fetch(mlApiUrl('/api/clothing/extract'), { method: 'POST', body: formData });
  if (!response.ok) throw new Error((await readErrorDetail(response)) || `정밀 누끼 API 오류: ${response.status}`);
  return response.json() as Promise<BackgroundRemoveResult>;
}

export async function requestUrlIngest(url: string) {
  const response = await fetch('/api/ingest/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error((await readErrorDetail(response)) || `URL 분석 API 오류: ${response.status}`);
  }
  return response.json() as Promise<UrlIngestApiResult>;
}

// 외부 CDN 이미지는 브라우저 CORS 제한 때문에 서버 프록시로만 내려받을 수 있다.
export async function requestUrlImageBlob(url: string) {
  const response = await fetch('/api/ingest/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error((await readErrorDetail(response)) || `이미지 가져오기 API 오류: ${response.status}`);
  }
  return response.blob();
}

async function readErrorDetail(response: Response) {
  try {
    const payload = await response.json();
    return typeof payload?.detail === 'string' ? payload.detail : '';
  } catch {
    return '';
  }
}
