// 수동 의류 등록 폼과 AI 누끼 처리 상태를 관리하는 훅입니다.
import React, { useRef, useState } from 'react';
import type { AvailabilityStatus, ClothingCategory, ClothingSegmentationMeta } from '../wardrobeTypes';
import { CUTOUT_VERSION, FINE_LABEL_TO_TYPE, PRECISION_TARGET_BY_CATEGORY, SIZES, TYPES } from '../wardrobeConstants';
import { dominantColorFromAnalysis } from '../services/clothingMeta';
import { getApiHealth, requestBackgroundRemoval, requestPrecisionExtraction, requestUrlImageBlob, requestUrlIngest, resizeImageFileForUpload } from '../services/clothingImageApi';
import type { UrlIngestApiResult } from '../services/clothingImageApi';

export interface UrlImportState {
  url: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  result: UrlIngestApiResult | null;
  error: string;
  adoptStatus: 'idle' | 'processing' | 'error';
  adoptError: string;
}

// 상품명에서 사이트 꼬리표(| 무신사, - 사이즈 & 후기 등)를 잘라 초안 텍스트로 만듭니다.
function cleanProductTitle(title: string | null) {
  if (!title) return '';
  return title.split('|')[0].split(' - ')[0].trim();
}

export function useManualClothing() {
  const [manual, setManual] = useState({
    imageUrl: '',
    originalImageUrl: '',
    cutoutImageUrl: '',
    imageFile: null as File | null,
    segmentation: null as ClothingSegmentationMeta | null,
    category: '상의' as ClothingCategory,
    type: '반팔티',
    color: '화이트',
    size: 'M',
    brand: '',
    seasonTag: '사계절',
    availabilityStatus: '보유중' as AvailabilityStatus,
    predictedSeasonTag: null as string | null,
    predictedMaterial: null as string | null,
    aiAnalyzed: false,
    aiConfidence: null as number | null,
    sourceType: 'upload' as 'upload' | 'url',
    sourceRef: '',
  });
  const [urlImport, setUrlImport] = useState<UrlImportState>({ url: '', status: 'idle', result: null, error: '', adoptStatus: 'idle', adoptError: '' });
  const [backgroundRemoveStatus, setBackgroundRemoveStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [backgroundRemoveError, setBackgroundRemoveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // 실패 메시지를 만든다. 서버가 꺼져 있으면 "연결 불가"로, 떠 있으면 실제 실패 사유로 안내해 사용자가 다음 행동을 알 수 있게 한다.
  const describeFailure = async (error: unknown, fallback: string) => {
    const online = await getApiHealth();
    if (!online) return 'AI 분석 서버에 연결할 수 없습니다. 직접 입력하거나, 서버 실행 후 다시 시도하세요.';
    return error instanceof Error ? error.message : fallback;
  };

  const autoAnalyzeOnUpload = async (file: File) => {
    setBackgroundRemoveStatus('processing');
    setBackgroundRemoveError('');
    let success = false;
    try {
      const resized = await resizeImageFileForUpload(file);
      const result = await requestPrecisionExtraction(resized, 'auto', file.name || 'clothing.jpg');
      const detectedColor = dominantColorFromAnalysis(result.colors);
      const categoryMap: Record<string, ClothingCategory> = { upper: '상의', lower: '하의', outer: '아우터', shoe: '신발', bag: '액세서리', accessory: '액세서리' };
      const detectedCat: ClothingCategory = (result.detectedCategory && categoryMap[result.detectedCategory]) || '상의';
      const firstMatchedType = result.fineLabels
        ?.map((label) => FINE_LABEL_TO_TYPE[label])
        .find((type) => type && TYPES[detectedCat].includes(type));
      const seasonTagFromAI = result.predictedSeason && result.predictedSeason !== '미분류' ? result.predictedSeason : '사계절';

      // 등록 시 원본 사진은 그대로 유지한다. 실제 컷아웃 이미지 적용은 누끼 따기/정밀 누끼 버튼으로 사용자가 선택한다.
      setManual((prev) => ({
        ...prev,
        color: detectedColor?.hex ?? prev.color,
        category: detectedCat,
        type: firstMatchedType ?? TYPES[detectedCat][0],
        seasonTag: seasonTagFromAI,
        segmentation: {
          width: result.width,
          height: result.height,
          bbox: result.bbox,
          colors: result.colors ?? [],
          model: result.model,
          version: result.version ?? 'fashion-segformer-v1',
          processedAt: result.processedAt,
        },
        predictedSeasonTag: result.predictedSeason ?? null,
        predictedMaterial: result.predictedMaterial ?? null,
        aiAnalyzed: true,
        aiConfidence: result.seasonConfidence ?? null,
      }));
      success = true;
    } catch (error) {
      setBackgroundRemoveError(await describeFailure(error, 'AI 분석에 실패했습니다. 직접 입력하거나 누끼 따기를 사용하세요.'));
    } finally {
      setBackgroundRemoveStatus(success ? 'done' : 'error');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setManual((prev) => ({ ...prev, imageUrl: objectUrl, originalImageUrl: objectUrl, cutoutImageUrl: '', imageFile: file, segmentation: null, aiAnalyzed: false, aiConfidence: null, sourceType: 'upload', sourceRef: '' }));
    setBackgroundRemoveStatus('idle');
    setBackgroundRemoveError('');
    autoAnalyzeOnUpload(file);
  };

  const removeManualBackground = async () => {
    if (!manual.imageFile) {
      setBackgroundRemoveStatus('error');
      setBackgroundRemoveError('먼저 앨범에서 이미지를 선택하거나 사진을 찍어주세요.');
      return;
    }
    setBackgroundRemoveStatus('processing');
    setBackgroundRemoveError('');
    let success = false;
    try {
      const resized = await resizeImageFileForUpload(manual.imageFile);
      const result = await requestBackgroundRemoval(resized, manual.imageFile.name || 'clothing.jpg');
      const detectedColor = dominantColorFromAnalysis(result.colors);
      setManual((prev) => ({
        ...prev,
        imageUrl: result.imageDataUrl,
        cutoutImageUrl: result.imageDataUrl,
        color: detectedColor?.hex ?? prev.color,
        segmentation: {
          width: result.width,
          height: result.height,
          bbox: result.bbox,
          colors: result.colors ?? [],
          model: result.model,
          version: result.version ?? CUTOUT_VERSION,
          processedAt: result.processedAt,
        },
      }));
      success = true;
    } catch (error) {
      setBackgroundRemoveError(await describeFailure(error, '누끼 처리에 실패했습니다.'));
    } finally {
      setBackgroundRemoveStatus(success ? 'done' : 'error');
    }
  };

  const extractManualClothingPrecisely = async () => {
    if (!manual.imageFile) {
      setBackgroundRemoveStatus('error');
      setBackgroundRemoveError('먼저 앨범에서 이미지를 선택하거나 사진을 찍어주세요.');
      return;
    }
    setBackgroundRemoveStatus('processing');
    setBackgroundRemoveError('');
    let success = false;
    try {
      const resized = await resizeImageFileForUpload(manual.imageFile);
      const targetPart = PRECISION_TARGET_BY_CATEGORY[manual.category];
      const result = await requestPrecisionExtraction(resized, targetPart, manual.imageFile.name || 'clothing.jpg');
      const detectedColor = dominantColorFromAnalysis(result.colors);
      setManual((prev) => ({
        ...prev,
        imageUrl: result.imageDataUrl,
        cutoutImageUrl: result.imageDataUrl,
        color: detectedColor?.hex ?? prev.color,
        segmentation: {
          width: result.width,
          height: result.height,
          bbox: result.bbox,
          colors: result.colors ?? [],
          model: result.model,
          version: result.version ?? 'fashion-segformer-v1',
          processedAt: result.processedAt,
        },
        predictedSeasonTag: result.predictedSeason ?? null,
        predictedMaterial: result.predictedMaterial ?? null,
      }));
      success = true;
    } catch (error) {
      setBackgroundRemoveError(await describeFailure(error, '정밀 누끼 처리에 실패했습니다.'));
    } finally {
      setBackgroundRemoveStatus(success ? 'done' : 'error');
    }
  };

  const handleManualCategory = (category: ClothingCategory) => {
    const size = category === '하의' ? SIZES.bottoms[0] : category === '신발' ? SIZES.shoes[0] : SIZES.tops[1];
    setManual((prev) => ({ ...prev, category, type: TYPES[category][0], size }));
  };

  const analyzeUrlImport = async () => {
    const url = urlImport.url.trim();
    if (!url) {
      setUrlImport((prev) => ({ ...prev, status: 'error', result: null, error: '쇼핑몰 상품 주소나 이미지 주소를 입력해 주세요.' }));
      return;
    }
    setUrlImport((prev) => ({ ...prev, url, status: 'processing', result: null, error: '', adoptStatus: 'idle', adoptError: '' }));
    try {
      const result = await requestUrlIngest(url);
      setUrlImport((prev) => ({ ...prev, status: 'done', result, error: '' }));
    } catch (error) {
      setUrlImport((prev) => ({
        ...prev,
        status: 'error',
        result: null,
        error: error instanceof Error ? error.message : '주소 분석에 실패했습니다.',
      }));
    }
  };

  // URL 분석 결과의 대표 이미지를 서버 프록시로 내려받아 사진 업로드와 같은 자동 분석 경로에 태웁니다.
  // 반환값은 "이미지를 성공적으로 가져왔는지"만 나타낸다. 그 이후 색상·분류 자동 분석 실패는
  // backgroundRemoveStatus/backgroundRemoveError로 별도 노출되고 사진 업로드와 동일하게 복구한다.
  const adoptUrlImage = async (): Promise<boolean> => {
    const result = urlImport.result;
    const imageSource = result?.representativeImageUrl;
    if (!result || !imageSource) return false;
    setUrlImport((prev) => ({ ...prev, adoptStatus: 'processing', adoptError: '' }));
    try {
      const blob = await requestUrlImageBlob(imageSource);
      const file = new File([blob], 'url-clothing.jpg', { type: blob.type || 'image/jpeg' });
      const objectUrl = URL.createObjectURL(file);
      const draftBrand = cleanProductTitle(result.productTitle);
      setManual((prev) => ({
        ...prev,
        imageUrl: objectUrl,
        originalImageUrl: objectUrl,
        cutoutImageUrl: '',
        imageFile: file,
        segmentation: null,
        aiAnalyzed: false,
        aiConfidence: null,
        brand: draftBrand || prev.brand,
        sourceType: 'url',
        sourceRef: result.sourceRef,
      }));
      setUrlImport((prev) => ({ ...prev, adoptStatus: 'idle', adoptError: '' }));
      await autoAnalyzeOnUpload(file);
      return true;
    } catch (error) {
      setUrlImport((prev) => ({
        ...prev,
        adoptStatus: 'error',
        adoptError: error instanceof Error ? error.message : '대표 이미지를 가져오지 못했습니다.',
      }));
      return false;
    }
  };

  return {
    manual,
    setManual,
    urlImport,
    setUrlImport,
    fileInputRef,
    cameraInputRef,
    backgroundRemoveStatus,
    backgroundRemoveError,
    handleFileChange,
    removeManualBackground,
    extractManualClothingPrecisely,
    analyzeUrlImport,
    adoptUrlImage,
    handleManualCategory,
  };
}
