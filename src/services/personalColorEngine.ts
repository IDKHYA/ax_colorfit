// 퍼스널컬러 사진 분석과 설문 점수를 최종 진단 결과로 합산하는 엔진입니다.
/*
 * personalColorEngine.ts
 *
 * 브라우저 내부에서 동작하는 퍼스널컬러 룰 엔진입니다. 외부 AI API 호출 없이 순수 계산으로 동작합니다.
 * PhotoAnalysisResult와 QuestionnaireScores를 받아 12시즌별 사진 점수, 설문 점수, 최종 융합 점수, 신뢰도, 설명 문구를 계산합니다.
 *
 * 주요 로직은 다음과 같습니다.
 * 1. 사진에서 추출한 skin/hair/eyes/lips 색을 Lab으로 변환해 시즌 팔레트와 Delta E 거리 기반 paletteScore를 계산합니다.
 * 2. temperature, lightness, clarity, contrast, mutedScore 특징 벡터를 시즌 traits와 비교합니다.
 * 3. mutedScore가 높은 경우 겨울 과분류를 낮추고 soft 계열을 보정하는 도메인 규칙을 적용합니다.
 * 4. 설문 4축 점수와 사진 점수를 photoQuality 기반 동적 비율로 융합합니다.
 * 5. Top1/Top2 시즌, confidence, boundary, evidence, debug 데이터를 포함한 FinalResult를 생성합니다.
 *
 * 이 파일은 발표에서 "오픈소스를 그대로 복사한 결과"가 아니라
 * 얼굴 색상 신호와 사용자 착용 경험을 결합한 자체 판정 로직의 근거가 되는 부분입니다.
 */
import { QUESTIONS } from '@/src/constants';
import { SEASON_PROFILES, SEASON_ORDER, WORKBOOK_SOURCE } from '@/src/personalColorWorkbook';
import { SEASON_DETAILS } from '@/src/seasonContent';
import {
  ExtractedColors,
  FinalResult,
  MeasurementDetails,
  PhotoAnalysisResult,
  QuestionnaireScores,
  SeasonId,
} from '@/src/types';
import {
  clamp,
  labTemperatureIndex,
  deltaE2000,
  hexToRgb,
  luminance,
  normalize,
  parseRgbString,
  rgbToLab,
} from '@/src/services/colorUtils';

interface AnalyzePhotoColorsInput {
  extractedColors: ExtractedColors;
  photoQuality: number;
  measurementDetails: MeasurementDetails;
}

const PHOTO_TRAIT_WEIGHTS = {
  temperature: 0.3,
  lightness: 0.16,
  clarity: 0.34,
  contrast: 0.2,
} as const;

const QUESTION_TRAIT_WEIGHTS = {
  temperature: 0.38,
  lightness: 0.2,
  clarity: 0.25,
  contrast: 0.17,
} as const;

// 축별 사진/설문 기본 신뢰도.
// 사진은 온도가 약하고(캘리브레이션 없는 조명에서 피부가 항상 웜쪽으로 읽힘) 명도·대비가 강합니다.
// 설문은 온도(언더톤 자가판단)가 강하고 나머지는 보통입니다. 서로의 약점을 보완하도록 배분했습니다.
const PHOTO_AXIS_RELIABILITY = { temperature: 0.3, lightness: 0.85, clarity: 0.55, contrast: 0.6 } as const;
const QUESTION_AXIS_RELIABILITY = { temperature: 0.8, lightness: 0.55, clarity: 0.6, contrast: 0.55 } as const;

// 사진·설문을 축별로 융합한 뒤 12시즌을 "한 번만" 채점할 때 쓰는 축 중요도입니다.
const FUSED_TRAIT_WEIGHTS = { temperature: 0.32, lightness: 0.24, clarity: 0.28, contrast: 0.16 } as const;

const AXES = ['temperature', 'lightness', 'clarity', 'contrast'] as const;

// 시즌 팔레트는 매번 HEX -> Lab 변환하면 비용이 크므로, 모듈 로딩 시 한 번만 Lab 좌표로 캐싱합니다.
const SEASON_PALETTE_LABS = Object.fromEntries(
  SEASON_ORDER.map((seasonId) => [seasonId, SEASON_PROFILES[seasonId].palette.map((hex) => rgbToLab(hexToRgb(hex)))]),
) as Record<SeasonId, ReturnType<typeof rgbToLab>[]>;

function round4(value: number) {
  return Number(value.toFixed(4));
}

function closeness(value: number, target: number) {
  return clamp(1 - Math.abs(value - target) / 2, 0, 1);
}

function normalizeSeasonScores(scores: Record<SeasonId, number>) {
  const entries = SEASON_ORDER.map((id) => [id, scores[id]] as const);
  const total = entries.reduce((sum, [, score]) => sum + score, 0) || 1;
  return Object.fromEntries(entries.map(([id, score]) => [id, score / total])) as Record<SeasonId, number>;
}

function rankSeasonScores(scores: Record<SeasonId, number>) {
  return [...SEASON_ORDER]
    .map((seasonId) => ({ seasonId, score: scores[seasonId] }))
    .sort((a, b) => b.score - a.score);
}

// 사진에서 추출한 피부/머리/눈/입술 색을 4축 특징으로 바꿉니다.
// 이 단계가 사진 분석 결과를 12시즌 traits와 비교 가능한 숫자 벡터로 만드는 핵심 전처리입니다.
function measureColorFeatures(extractedColors: ExtractedColors) {
  const skin = parseRgbString(extractedColors.skin);
  const hair = parseRgbString(extractedColors.hair);
  const eyes = parseRgbString(extractedColors.eyes);
  const lips = parseRgbString(extractedColors.lips);

  const luminances = {
    skin: luminance(skin),
    hair: luminance(hair),
    eyes: luminance(eyes),
    lips: luminance(lips),
  };

  // 온도는 피부를 가장 크게 보고, 입술/머리/눈을 보조 신호로 사용합니다.
  // Lab b* 축 기반으로 계산해 조명 변화에 덜 민감하고 지각적으로 더 정확합니다.
  const temperature = clamp(
    labTemperatureIndex(skin) * 0.45 +
      labTemperatureIndex(lips) * 0.25 +
      labTemperatureIndex(hair) * 0.15 +
      labTemperatureIndex(eyes) * 0.15,
    -1,
    1,
  );

  // 명도는 얼굴 전체가 밝은 톤인지 깊은 톤인지 보기 위한 축입니다.
  // 피부 비중을 가장 크게 두되 머리카락의 어두움도 일부 반영합니다.
  const lightness = clamp(
    (luminances.skin * 0.45 + luminances.lips * 0.2 + luminances.eyes * 0.15 + luminances.hair * 0.2) * 2 - 1,
    -1,
    1,
  );

  // 선명도(clarity)는 HSL 채도 대신 Lab chroma(C* = √(a²+b²))로 계산합니다.
  // HSL 채도는 어두운 머리·눈에서 왜곡이 크고 자연 얼굴이 한쪽으로 몰려 변별력이 없습니다.
  // (과거 구현은 가중합을 average()로 다시 4로 나눠 채도가 1/4로 눌리는 버그가 있었습니다.)
  const chromaOf = (color: { r: number; g: number; b: number }) => {
    const lab = rgbToLab(color);
    return Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  };
  const weightedChroma = chromaOf(skin) * 0.4 + chromaOf(lips) * 0.25 + chromaOf(eyes) * 0.2 + chromaOf(hair) * 0.15;
  // 자연 얼굴 chroma 경험 대역(C* 약 8~34)을 -1~1로 매핑해 얼굴이 축 전체에 퍼지도록 캘리브레이션합니다.
  const FACE_CHROMA_MIN = 8;
  const FACE_CHROMA_MAX = 34;
  const clarity = clamp(((weightedChroma - FACE_CHROMA_MIN) / (FACE_CHROMA_MAX - FACE_CHROMA_MIN)) * 2 - 1, -1, 1);
  // mutedScore는 clarity를 0~1로 뒤집은 값입니다. clarity가 낮을수록(저채도) 뮤트에 가깝습니다.
  const mutedScore = clamp((1 - clarity) / 2, 0, 1);

  // 대비는 얼굴 내부 대비를 중심으로 계산합니다. 머리카락 대비만으로 겨울 타입이 과분류되는 것을 막기 위해 hairContrast 비중을 낮췄습니다.
  const facialLuminances = [luminances.skin, luminances.eyes, luminances.lips];
  const facialContrast = Math.max(...facialLuminances) - Math.min(...facialLuminances);
  const hairContrast = Math.abs(luminances.skin - luminances.hair);
  const contrastRaw = facialContrast * 0.78 + hairContrast * 0.22;
  const contrast = clamp(contrastRaw * 2 - 0.24, -1, 1);

  return {
    colors: { skin, hair, eyes, lips },
    normalizedFeatures: {
      temperature: round4(temperature),
      lightness: round4(lightness),
      clarity: round4(clarity),
      contrast: round4(contrast),
      mutedScore: round4(mutedScore),
    },
  };
}

// 추출 색상 하나가 특정 시즌 팔레트와 얼마나 가까운지 계산합니다.
// Delta E 최단 거리를 0~1 점수로 바꾸어 skin/hair/eyes/lips별 팔레트 점수에 사용합니다.
function scorePaletteMatch(colorCss: string, seasonId: SeasonId) {
  const sampleLab = rgbToLab(parseRgbString(colorCss));
  // 색상 계약: 지각 거리는 CIEDE2000을 사용합니다(CIE76 유클리드 대비 파랑 계열 비균일성 보정).
  const distances = SEASON_PALETTE_LABS[seasonId].map((paletteLab) => deltaE2000(sampleLab, paletteLab));
  const bestDistance = Math.min(...distances);
  // CIEDE2000은 CIE76보다 값이 압축되므로 정규화 분모를 45로 재보정합니다.
  return clamp(1 - bestDistance / 45, 0, 1);
}

// 개발자 모드에서 각 시즌 점수가 어떤 축에서 갈렸는지 추적하기 위한 설명 문장입니다.
// (과거의 겨울 페널티/소프트 보너스 등 도메인 보정은 제거되었습니다. clarity 측정이 정상화되어
//  뮤트한 얼굴은 closeness 유사도만으로 자연스럽게 저채도 시즌에 가까워지므로 별도 감점이 불필요합니다.)
function seasonDebugNotes(features: QuestionnaireScores, seasonId: SeasonId) {
  const traits = SEASON_PROFILES[seasonId].traits;
  const axisGap = (label: string, value: number, target: number) =>
    `${label} 근접도 ${round4(closeness(value, target))} (측정 ${round4(value)} / 목표 ${target})`;
  return [
    '보정 없이 4축 특징 유사도와 팔레트 거리만 반영했습니다.',
    axisGap('온도', features.temperature, traits.temperature),
    axisGap('선명도', features.clarity, traits.clarity),
    axisGap('대비', features.contrast, traits.contrast),
  ];
}

// features와 시즌 traits 사이의 유사도를 계산합니다.
// 사진 점수와 설문 점수는 중요도가 다르기 때문에 weights를 인자로 받아 같은 계산식을 재사용합니다.
function scoreSeasonTraits(features: QuestionnaireScores, seasonId: SeasonId, weights: Record<keyof QuestionnaireScores, number>) {
  const traits = SEASON_PROFILES[seasonId].traits;
  return clamp(
    closeness(features.temperature, traits.temperature) * weights.temperature +
      closeness(features.lightness, traits.lightness) * weights.lightness +
      closeness(features.clarity, traits.clarity) * weights.clarity +
      closeness(features.contrast, traits.contrast) * weights.contrast,
    0,
    1,
  );
}

// 사진 기반 시즌 점수입니다.
// 과거에는 여기서 겨울 페널티·소프트 보너스·고선명/고대비 페널티를 가산했지만,
// 그 보정들은 (1) clarity 측정 버그로 mutedScore가 전 사용자에게 최대치로 고정돼 항상 max로 걸렸고
// (2) clarity를 chroma 기반으로 정상화한 뒤에는 closeness 유사도와 중복이므로 전부 제거했습니다.
function scorePhotoSeasonTraits(features: QuestionnaireScores, seasonId: SeasonId) {
  return scoreSeasonTraits(features, seasonId, PHOTO_TRAIT_WEIGHTS);
}

// Top1과 Top2가 가까울 때 결과 화면에 경계 시즌 안내를 표시합니다.
// 단일 라벨로 확정하기 어려운 경우 사용자가 인접 시즌도 참고할 수 있게 설명합니다.
function boundaryNote(topSeasonId: SeasonId, secondSeasonId: SeasonId, gap: number) {
  const top = SEASON_DETAILS[topSeasonId];
  const second = SEASON_DETAILS[secondSeasonId];
  if (gap < 0.06) {
    return `${top.title}와 ${second.title} 경계에 가까운 결과입니다. 상황에 따라 두 시즌의 색을 함께 참고하면 좋습니다.`;
  }
  if (top.adjacent.includes(secondSeasonId)) {
    return `${top.title}이 우세하지만 인접 시즌인 ${second.title}의 일부 톤도 자연스럽게 활용할 수 있습니다.`;
  }
  return `${top.title} 축이 비교적 분명하게 우세한 결과입니다.`;
}

// 내부 온도 점수를 사용자에게 보여줄 warm/cool 라벨로 단순화합니다.
function temperatureLabel(value: number) {
  if (value > 0.18) return 'warm';
  if (value < -0.18) return 'cool';
  return value >= 0 ? 'warm' : 'cool';
}

// 5문항 선택지를 temperature/lightness/clarity/contrast 4축 점수로 합산하고 -1~1로 정규화합니다.
// 사진 분석이 불안정할 때 착용 경험 기반 설문이 최종 판정을 보정하는 역할을 합니다.
export function calculateQuestionnaireScores(rawResponses: Record<string, string>): QuestionnaireScores {
  const totals: QuestionnaireScores = {
    temperature: 0,
    lightness: 0,
    clarity: 0,
    contrast: 0,
  };
  const maximums: QuestionnaireScores = {
    temperature: 0,
    lightness: 0,
    clarity: 0,
    contrast: 0,
  };

  QUESTIONS.forEach((question) => {
    const selected = question.options.find((option) => option.value === rawResponses[question.id]);
    // 무응답 또는 "잘 모르겠어요"(unknown)는 해당 문항을 축 계산에서 완전히 제외합니다.
    // 0을 넣으면 "확실히 중립"으로 오해되므로, 분자(totals)뿐 아니라 분모(maximums)에서도 빼서
    // 정규화 기준을 응답한 문항만으로 좁힙니다.
    if (!selected || selected.unknown) return;

    // 이 문항이 각 축에 기여할 수 있는 최대 절댓값(응답 여부와 무관한 문항 고유 상수)을 분모에 더합니다.
    maximums.temperature += Math.max(...question.options.map((option) => Math.abs(option.weights.temperature ?? 0)), 0);
    maximums.lightness += Math.max(...question.options.map((option) => Math.abs(option.weights.lightness ?? 0)), 0);
    maximums.clarity += Math.max(...question.options.map((option) => Math.abs(option.weights.clarity ?? 0)), 0);
    maximums.contrast += Math.max(...question.options.map((option) => Math.abs(option.weights.contrast ?? 0)), 0);

    totals.temperature += selected.weights.temperature ?? 0;
    totals.lightness += selected.weights.lightness ?? 0;
    totals.clarity += selected.weights.clarity ?? 0;
    totals.contrast += selected.weights.contrast ?? 0;
  });

  return {
    temperature: round4(normalize(totals.temperature, maximums.temperature)),
    lightness: round4(normalize(totals.lightness, maximums.lightness)),
    clarity: round4(normalize(totals.clarity, maximums.clarity)),
    contrast: round4(normalize(totals.contrast, maximums.contrast)),
  };
}

// 설문의 축별 신뢰도(0~1): 그 축이 실제로 정보성 응답을 얼마나 받았는지.
// = 응답한 문항의 축별 최대치 합 / 전체 문항의 축별 최대치 합.
// "잘 모르겠어요"/무응답은 분자에서 빠지므로, 해당 축의 설문 신뢰도가 낮아지고 융합 시 사진에 더 의존하게 됩니다.
function questionnaireAxisConfidence(rawResponses: Record<string, string>): QuestionnaireScores {
  const answered: QuestionnaireScores = { temperature: 0, lightness: 0, clarity: 0, contrast: 0 };
  const full: QuestionnaireScores = { temperature: 0, lightness: 0, clarity: 0, contrast: 0 };

  QUESTIONS.forEach((question) => {
    const perMax = (axis: keyof QuestionnaireScores) =>
      Math.max(...question.options.map((option) => Math.abs(option.weights[axis] ?? 0)), 0);
    AXES.forEach((axis) => {
      full[axis] += perMax(axis);
    });
    const selected = question.options.find((option) => option.value === rawResponses[question.id]);
    if (!selected || selected.unknown) return;
    AXES.forEach((axis) => {
      answered[axis] += perMax(axis);
    });
  });

  return {
    temperature: full.temperature ? answered.temperature / full.temperature : 0,
    lightness: full.lightness ? answered.lightness / full.lightness : 0,
    clarity: full.clarity ? answered.clarity / full.clarity : 0,
    contrast: full.contrast ? answered.contrast / full.contrast : 0,
  };
}

// 얼굴 ROI에서 추출한 색상만으로 12시즌별 사진 점수를 계산합니다.
// 팔레트 거리와 4축 traits 유사도를 결합해 PhotoAnalysisResult를 만들고, 이후 설문과 융합됩니다.
export function analyzePhotoColors(input: AnalyzePhotoColorsInput): PhotoAnalysisResult {
  const featureBundle = measureColorFeatures(input.extractedColors);
  const features = featureBundle.normalizedFeatures;
  const photoSeasonBreakdown: NonNullable<PhotoAnalysisResult['debug']>['photoSeasonBreakdown'] = [];

  const rawSeasonScores = Object.fromEntries(
    SEASON_ORDER.map((seasonId) => {
      const paletteScore =
        scorePaletteMatch(input.extractedColors.skin, seasonId) * 0.45 +
        scorePaletteMatch(input.extractedColors.hair, seasonId) * 0.2 +
        scorePaletteMatch(input.extractedColors.eyes, seasonId) * 0.15 +
        scorePaletteMatch(input.extractedColors.lips, seasonId) * 0.2;
      const traitScore = scorePhotoSeasonTraits(features, seasonId);
      // 팔레트 거리는 "얼굴색이 그 시즌 의류 팔레트에 얼마나 가까운가"인데, 실제 얼굴은 의류보다 저채도라
      // 어스톤이 많은 가을 팔레트에 체계적으로 가까워지는 편향이 있습니다. 그래서 팔레트 거리는 주 판정이 아니라
      // 동률 해소 보조로 격하하고(42%→25%), 4축 특징 유사도 비중을 높였습니다(58%→75%).
      const rawScore = round4(paletteScore * 0.25 + traitScore * 0.75);
      photoSeasonBreakdown.push({
        seasonId,
        seasonName: SEASON_PROFILES[seasonId].name,
        paletteScore: round4(paletteScore),
        traitScore: round4(traitScore),
        rawScore,
        normalizedScore: 0,
        notes: seasonDebugNotes(features, seasonId),
      });
      return [seasonId, rawScore];
    }),
  ) as Record<SeasonId, number>;

  const seasonScores = normalizeSeasonScores(rawSeasonScores);
  photoSeasonBreakdown.forEach((item) => {
    item.normalizedScore = round4(seasonScores[item.seasonId]);
  });
  const ranked = rankSeasonScores(seasonScores);
  const topSeasonScores = ranked.slice(0, 4).map((item) => ({
    seasonId: item.seasonId,
    seasonName: SEASON_PROFILES[item.seasonId].name,
    score: Number((item.score * 100).toFixed(2)),
  }));

  return {
    temperature: temperatureLabel(features.temperature),
    temperatureConfidence: round4(clamp(Math.abs(features.temperature) * 0.7 + input.photoQuality * 0.3, 0, 1)),
    seasonScores,
    mutedScore: features.mutedScore,
    photoQuality: round4(input.photoQuality),
    extractedColors: input.extractedColors,
    measurementDetails: {
      ...input.measurementDetails,
      normalizedFeatures: features,
      topSeasonScores,
    },
    debug: {
      featureFormulaNotes: [
        'temperature = 피부 45% + 입술 25% + 머리 15% + 홍채 15%의 Lab 색온도 지수입니다.',
        'clarity = 피부/입술/홍채/머리 Lab chroma(C*) 가중합을 얼굴 대역(8~34)에서 -1~1로 정규화한 값입니다. 낮을수록 뮤트입니다.',
        'contrast = 얼굴 내부 대비 78% + 피부-머리 대비 22%입니다. 검은 머리만으로 겨울 고대비가 되지 않도록 머리 비중을 낮췄습니다.',
        '사진 시즌 점수 = 팔레트 거리 25% + 특징 유사도 75%입니다(CIEDE2000). 겨울 페널티/소프트 보너스 등 도메인 보정은 제거됐습니다.',
      ],
      photoSeasonBreakdown,
    },
  };
}

// 사진 신호와 설문 신호를 하나의 최종 결과로 합칩니다.
// 예전에는 사진/설문이 각각 12시즌 점수를 낸 뒤 스칼라 비율로 섞었지만(축별 강약을 못 살림),
// 지금은 4축을 "축별 신뢰도"로 먼저 융합하고, 융합된 4축으로 12시즌을 한 번만 채점합니다.
// 이렇게 하면 온도는 설문, 명도·대비는 사진처럼 축마다 잘하는 신호에 가중치를 줄 수 있습니다.
export function fuseResults(
  photoData: PhotoAnalysisResult,
  questionnaireScores: QuestionnaireScores,
  rawResponses: Record<string, string>,
): FinalResult {
  const photoAxes = photoData.measurementDetails.normalizedFeatures;
  const qConfidence = questionnaireAxisConfidence(rawResponses);
  // 사진 신뢰도는 사진 품질에 비례해 0.4~1.0배로 스케일합니다(품질이 낮으면 사진 축 신뢰도 전반이 내려감).
  const photoTrust = 0.4 + 0.6 * clamp(photoData.photoQuality, 0, 1);

  const fusedFeatures: QuestionnaireScores = { temperature: 0, lightness: 0, clarity: 0, contrast: 0 };
  const axisFusion = {} as Record<keyof QuestionnaireScores, { photo: number; question: number }>;
  let photoRelSum = 0;
  let questionRelSum = 0;
  AXES.forEach((axis) => {
    const pRel = PHOTO_AXIS_RELIABILITY[axis] * photoTrust;
    const qRel = QUESTION_AXIS_RELIABILITY[axis] * qConfidence[axis];
    const denom = pRel + qRel;
    fusedFeatures[axis] = denom > 0 ? (photoAxes[axis] * pRel + questionnaireScores[axis] * qRel) / denom : 0;
    axisFusion[axis] = { photo: round4(pRel), question: round4(qRel) };
    photoRelSum += pRel;
    questionRelSum += qRel;
  });

  // 융합된 4축으로 12시즌 점수를 한 번만 계산합니다.
  const fusedRaw = Object.fromEntries(
    SEASON_ORDER.map((seasonId) => [seasonId, scoreSeasonTraits(fusedFeatures, seasonId, FUSED_TRAIT_WEIGHTS)]),
  ) as Record<SeasonId, number>;
  const fusedScores = normalizeSeasonScores(fusedRaw);

  // 설문 단독 시즌 점수는 근거/디버그 표시용으로만 유지합니다(판정에는 위 융합 점수를 사용).
  const questionnaireRawScores = Object.fromEntries(
    SEASON_ORDER.map((seasonId) => [seasonId, scoreSeasonTraits(questionnaireScores, seasonId, QUESTION_TRAIT_WEIGHTS)]),
  ) as Record<SeasonId, number>;
  const questionnaireScoresNormalized = normalizeSeasonScores(questionnaireRawScores);

  const photoWeight = round4(photoRelSum / (photoRelSum + questionRelSum || 1));
  const questionnaireWeight = round4(1 - photoWeight);

  const questionnaireSeasonScores = SEASON_ORDER.map((seasonId) => ({
    seasonId,
    seasonName: SEASON_PROFILES[seasonId].name,
    rawScore: round4(questionnaireRawScores[seasonId]),
    normalizedScore: round4(questionnaireScoresNormalized[seasonId]),
  }));
  const fusedSeasonScores = SEASON_ORDER.map((seasonId) => ({
    seasonId,
    seasonName: SEASON_PROFILES[seasonId].name,
    photoScore: round4(photoData.seasonScores[seasonId] ?? 0),
    questionnaireScore: round4(questionnaireScoresNormalized[seasonId] ?? 0),
    fusedRawScore: round4(fusedRaw[seasonId]),
    fusedNormalizedScore: round4(fusedScores[seasonId]),
  }));
  const ranked = rankSeasonScores(fusedScores);
  const [first, second] = ranked;
  const topSeason = SEASON_PROFILES[first.seasonId];
  const secondSeason = SEASON_PROFILES[second.seasonId];
  const photoRanked = rankSeasonScores(photoData.seasonScores);
  const questionRanked = rankSeasonScores(questionnaireScoresNormalized);
  const photoTop = photoRanked[0];
  const questionTop = questionRanked[0];
  const gap = first.score - second.score;
  const consistency =
    photoTop.seasonId === questionTop.seasonId
      ? 'high'
      : SEASON_PROFILES[photoTop.seasonId].family === SEASON_PROFILES[questionTop.seasonId].family
        ? 'medium'
        : 'low';

  const confidenceBoost = consistency === 'high' ? 0.08 : consistency === 'medium' ? 0.03 : 0;
  const confidence = clamp(0.42 + first.score * 0.28 + gap * 1.35 + photoData.photoQuality * 0.12 + confidenceBoost, 0, 0.99);

  const explanation = `${topSeason.name} 결과가 가장 높게 나온 이유는 사진에서 읽힌 ${photoData.temperature === 'warm' ? '따뜻한' : '차가운'} 기조와 설문에서 드러난 ${questionnaireScores.clarity >= 0 ? '선명도' : '부드러운 뮤트 성향'}가 ${topSeason.name}의 특성과 가장 가깝게 맞았기 때문입니다. ${SEASON_DETAILS[first.seasonId].commonAliasSentence}`;

  return {
    temperature: topSeason.traits.temperature >= 0 ? 'warm' : 'cool',
    seasonTop1Id: first.seasonId,
    seasonTop1: topSeason.name,
    seasonTop2Id: second.seasonId,
    seasonTop2: secondSeason.name,
    confidence: round4(confidence),
    decisionType: 'hybrid',
    evidence: {
      photoSignal: {
        dominantSeasonId: photoTop.seasonId,
        temperature: photoData.temperature === 'warm' ? '웜 경향' : '쿨 경향',
        confidence: round4(photoTop.score),
        dominantSeason: SEASON_PROFILES[photoTop.seasonId].name,
      },
      questionSignal: {
        temperature: questionnaireScores.temperature >= 0 ? '웜 응답 우세' : '쿨 응답 우세',
        clarity: questionnaireScores.clarity >= 0 ? '선명도 선호' : '뮤트 선호',
        confidence: round4(questionTop.score),
      },
      consistency,
      workbookBasis: `${WORKBOOK_SOURCE} / 응답 ${Object.keys(rawResponses).length}개 반영`,
      fusionWeights: {
        photo: photoWeight,
        questionnaire: questionnaireWeight,
      },
      boundary: {
        isBoundary: gap < 0.06,
        gap: round4(gap),
        note: boundaryNote(first.seasonId, second.seasonId, gap),
      },
    },
    recommendationFeatures: {
      preferredTemperature: topSeason.traits.temperature >= 0 ? '따뜻한 웜톤' : '차갑고 맑은 쿨톤',
      preferredClarity: topSeason.traits.clarity >= 0.35 ? '선명하고 또렷한 컬러' : topSeason.traits.clarity <= -0.35 ? '회색 한 방울 섞인 뮤트 컬러' : '과하지 않게 정돈된 컬러',
      preferredLightness: topSeason.traits.lightness >= 0.45 ? '밝고 가벼운 톤' : topSeason.traits.lightness <= -0.45 ? '깊고 짙은 톤' : '중간 명도의 균형 잡힌 톤',
      contrastLevel: topSeason.traits.contrast >= 0.45 ? '대비가 큰 스타일' : topSeason.traits.contrast <= -0.2 ? '부드럽고 대비가 적은 스타일' : '중간 대비 스타일',
    },
    palette: topSeason.palette,
    extractedColors: photoData.extractedColors,
    explanation,
    debug: {
      questionnaireScores,
      questionnaireSeasonScores,
      fusedSeasonScores,
      rawResponses,
      fusedFeatures: {
        temperature: round4(fusedFeatures.temperature),
        lightness: round4(fusedFeatures.lightness),
        clarity: round4(fusedFeatures.clarity),
        contrast: round4(fusedFeatures.contrast),
      },
      photoFeatures: {
        temperature: round4(photoAxes.temperature),
        lightness: round4(photoAxes.lightness),
        clarity: round4(photoAxes.clarity),
        contrast: round4(photoAxes.contrast),
      },
      axisReliability: axisFusion,
    },
  };
}
