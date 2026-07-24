/*
 * types.ts
 *
 * 퍼스널컬러 진단 도메인의 공용 타입 정의 파일입니다.
 * 사진 분석 결과, 설문 점수, 12시즌 ID, 최종 진단 결과, 측정 상세 데이터처럼
 * 여러 컴포넌트와 서비스가 공유해야 하는 계약을 이 파일에 모아둡니다.
 *
 * PhotoAnalyzer는 PhotoAnalysisResult를 만들고,
 * Questionnaire는 QuestionnaireScores를 만들며,
 * personalColorEngine.ts의 로컬 룰 엔진은 두 값을 융합해 FinalResult를 생성합니다.
 * App.tsx와 ResultDisplay.tsx는 이 FinalResult를 저장/표시하고,
 * 추천 엔진은 FinalResult.palette과 seasonTop1Id를 사용해 의류 적합도를 계산합니다.
 */
export type SeasonFamily = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonId =
  | 'light-spring'
  | 'true-spring'
  | 'bright-spring'
  | 'light-summer'
  | 'true-summer'
  | 'soft-summer'
  | 'soft-autumn'
  | 'true-autumn'
  | 'dark-autumn'
  | 'dark-winter'
  | 'true-winter'
  | 'bright-winter';

export interface QuestionnaireScores {
  temperature: number;
  lightness: number;
  clarity: number;
  contrast: number;
}

export interface ExtractedColors {
  skin: string;
  hair: string;
  eyes: string;
  lips: string;
  // 결과 화면 표시 전용으로 이상화한 입술색입니다. 진단에는 lips(측정값)를 사용합니다.
  // 없으면 표시 측에서 lips로 폴백합니다(데모/구버전 데이터 호환).
  lipsDisplay?: string;
}

export interface RoiMeasurement {
  label: string;
  color: string;
  rgb: { r: number; g: number; b: number };
  lab: { l: number; a: number; b: number };
  hsl: { h: number; s: number; l: number };
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MeasurementDetails {
  faceBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  normalizedFeatures: {
    temperature: number;
    lightness: number;
    clarity: number;
    contrast: number;
    mutedScore: number;
  };
  qualityBreakdown: {
    overall: number;
    exposure: number;
    symmetry: number;
    distinctness: number;
    faceSize: number;
    background: number;
  };
  distributionBreakdown: {
    overall: number;
    skin: number;
    hair: number;
    eyes: number;
    lips: number;
  };
  lightingCalibration: {
    backgroundBrightness: number;
    backgroundNeutrality: number;
    correctionStrength: number;
    calibrationSource: 'white-reference' | 'neutral-background' | 'corner-fallback';
    whiteReferenceUsed: boolean;
    whiteBackdropRecommended: boolean;
  };
  roiMeasurements: RoiMeasurement[];
  topSeasonScores: Array<{
    seasonId: SeasonId;
    seasonName: string;
    score: number;
  }>;
}

export interface PhotoAnalysisResult {
  temperature: 'warm' | 'cool';
  temperatureConfidence: number;
  seasonScores: Record<SeasonId, number>;
  mutedScore: number;
  photoQuality: number;
  extractedColors: ExtractedColors;
  measurementDetails: MeasurementDetails;
  debug?: {
    featureFormulaNotes: string[];
    photoSeasonBreakdown: Array<{
      seasonId: SeasonId;
      seasonName: string;
      paletteScore: number;
      traitScore: number;
      rawScore: number;
      normalizedScore: number;
      notes: string[];
    }>;
  };
}

export interface FinalResult {
  temperature: 'warm' | 'cool';
  seasonTop1Id: SeasonId;
  seasonTop1: string;
  seasonTop2Id: SeasonId;
  seasonTop2: string;
  confidence: number;
  decisionType: 'hybrid' | 'photo' | 'questionnaire';
  evidence: {
    photoSignal: {
      dominantSeasonId: SeasonId;
      temperature: string;
      confidence: number;
      dominantSeason: string;
    };
    questionSignal: {
      temperature: string;
      clarity: string;
      confidence: number;
    };
    consistency: 'high' | 'medium' | 'low';
    workbookBasis: string;
    fusionWeights: {
      photo: number;
      questionnaire: number;
    };
    boundary: {
      isBoundary: boolean;
      gap: number;
      note: string;
    };
  };
  recommendationFeatures: {
    preferredTemperature: string;
    preferredClarity: string;
    preferredLightness: string;
    contrastLevel: string;
  };
  palette: string[];
  extractedColors: ExtractedColors;
  explanation: string;
  debug?: {
    questionnaireScores: QuestionnaireScores;
    questionnaireSeasonScores: Array<{
      seasonId: SeasonId;
      seasonName: string;
      rawScore: number;
      normalizedScore: number;
    }>;
    fusedSeasonScores: Array<{
      seasonId: SeasonId;
      seasonName: string;
      photoScore: number;
      questionnaireScore: number;
      fusedRawScore: number;
      fusedNormalizedScore: number;
    }>;
    rawResponses: Record<string, string>;
    // 축별 융합 진단용(개발 모드): 사진·설문을 신뢰도로 섞은 4축 결과와 축별 사진/설문 신뢰도.
    fusedFeatures?: QuestionnaireScores;
    photoFeatures?: QuestionnaireScores;
    axisReliability?: Record<'temperature' | 'lightness' | 'clarity' | 'contrast', { photo: number; question: number }>;
  };
}

export interface Question {
  id: string;
  text: string;
  kind?: 'signal';
  helperText?: string;
  options: {
    label: string;
    value: string;
    weights: Partial<QuestionnaireScores>;
    description?: string;
    swatches?: string[];
    swatchCaption?: string;
    // true이면 "잘 모르겠어요" 같은 응답으로, 해당 축 점수 계산(분자·분모 모두)에서 제외됩니다.
    // 값 0(중립, 확신 있음)과 무응답/모름(확신 없음)을 구분하기 위한 플래그입니다.
    unknown?: boolean;
  }[];
}

export interface SeasonProfile {
  id: SeasonId;
  name: string;
  englishName: string;
  family: SeasonFamily;
  toneNote: string;
  traits: QuestionnaireScores;
  workbookStats: {
    averageRgb: [number, number, number];
    averageLightness: number;
    averageSaturation: number;
    averageTemperature: number;
    averageContrast: number;
  };
  palette: string[];
}


