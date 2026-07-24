/*
 * constants.ts
 *
 * 퍼스널컬러 설문 도메인의 기준 질문 데이터를 정의합니다.
 * 사용자는 5개 문항에 답하고, 각 선택지는 temperature, lightness, clarity, contrast 축에 가중치를 더합니다.
 *
 * 이 파일의 질문 데이터는 Questionnaire.tsx에서 화면으로 렌더링되고,
 * 선택 결과는 설문 점수로 정규화된 뒤 personalColorEngine.ts의 하이브리드 융합 로직에 전달됩니다.
 * 사진 분석이 조명과 카메라 편차에 흔들릴 수 있기 때문에,
 * 이 설문 축은 최종 결과를 안정화하는 중요한 보정 신호입니다.
 */
import { Question, QuestionnaireScores } from './types';

// 설문 문구는 결과 방향(웜/쿨/시즌명)을 노출하지 않습니다. "어느 쪽이 더 자연스러운가"만 묻고,
// 각 선택지가 어떤 판단에 쓰였는지는 결과 근거 화면에서만 설명합니다(응답 왜곡 방지).
// "잘 모르겠어요"는 unknown:true로, 해당 축 계산에서 아예 제외됩니다(0=중립과 구분).
export const QUESTIONS: Question[] = [
  {
    id: 'vein_color',
    kind: 'signal',
    text: '자연광에서 손목 안쪽 혈관은 어떻게 보이나요?',
    helperText: '창가 자연광에서 손목 안쪽을 봤을 때 어느 빛이 더 도는지 떠올려 주세요.',
    options: [
      {
        label: '초록빛이 더 도는 편이에요',
        value: 'green',
        weights: { temperature: 0.55 },
        swatches: ['#7A8F47', '#90A955', '#A9C46C'],
        swatchCaption: '올리브 · 카키 · 세이지',
      },
      {
        label: '파랑이나 보랏빛이 더 도는 편이에요',
        value: 'blue',
        weights: { temperature: -0.55 },
        swatches: ['#6D7FD3', '#8BA6FF', '#A79BEF'],
        swatchCaption: '블루 · 라벤더 · 페리윙클',
      },
      {
        label: '둘 다 비슷하게 보여요',
        value: 'mix',
        weights: { temperature: 0 },
        swatches: ['#B8C0CC', '#CED5DE', '#E2E8F0'],
        swatchCaption: '중성 회청색 계열',
      },
      {
        label: '잘 모르겠어요',
        value: 'unknown',
        weights: {},
        unknown: true,
      },
    ],
  },
  {
    id: 'jewelry_reaction',
    kind: 'signal',
    text: '얼굴 가까이 댔을 때 더 자연스러운 금속은 무엇인가요?',
    helperText: '피부가 깨끗하고 혈색이 좋아 보이는 쪽을 골라 주세요.',
    options: [
      {
        label: '골드 계열',
        value: 'gold',
        weights: { temperature: 0.65 },
        swatches: ['#D4AF37', '#E6C96B', '#F6E2A6'],
        swatchCaption: '골드 · 허니 골드 · 샴페인 골드',
      },
      {
        label: '실버/플래티넘 계열',
        value: 'silver',
        weights: { temperature: -0.65 },
        swatches: ['#BFC7D5', '#DDE3EC', '#F4F7FB'],
        swatchCaption: '실버 · 아이스 실버 · 플래티넘',
      },
      {
        label: '둘 다 비슷해요',
        value: 'both',
        weights: { temperature: 0 },
        swatches: ['#D8D1C0', '#D9DEE7', '#EEF1F5'],
        swatchCaption: '웜·쿨 모두 무난한 금속감',
      },
      {
        label: '잘 모르겠어요',
        value: 'unknown',
        weights: {},
        unknown: true,
      },
    ],
  },
  {
    id: 'vibrant_colors',
    kind: 'signal',
    text: '선명한 색을 얼굴 가까이 댔을 때 어떤 변화가 있나요?',
    helperText: '아래처럼 채도가 높고 회색기가 거의 없는 색을 떠올려 주세요.',
    options: [
      {
        label: '얼굴선이 또렷해지고 생기 있어 보여요',
        value: 'glow',
        weights: { clarity: 0.7, contrast: 0.3 },
        swatches: ['#FF5A5F', '#00B8D9', '#FFD400', '#00C853'],
        swatchCaption: '비비드 핑크 · 코발트 · 선명한 옐로 · 쨍한 그린',
      },
      {
        label: '색이 먼저 보이고 얼굴이 묻혀 보여요',
        value: 'overwhelmed',
        weights: { clarity: -0.7, contrast: -0.3 },
        swatches: ['#FF5A5F', '#00B8D9', '#FFD400', '#00C853'],
        swatchCaption: '강한 원색과 고채도 컬러 예시',
      },
      {
        label: '큰 차이를 느끼기 어려워요',
        value: 'neutral',
        weights: { clarity: 0, contrast: 0 },
        swatches: ['#FF8A8E', '#59CFE5', '#F1DC72', '#6FD38D'],
        swatchCaption: '중간 밝기의 선명한 컬러',
      },
      {
        label: '잘 모르겠어요',
        value: 'unknown',
        weights: {},
        unknown: true,
      },
    ],
  },
  {
    id: 'contrast_preference',
    kind: 'signal',
    text: '어떤 색 조합에서 얼굴이 가장 자연스럽게 보이나요?',
    helperText: '밝고 어두운 차이가 큰 조합인지, 비슷한 밝기로 이어지는 조합인지 떠올려 주세요.',
    options: [
      {
        label: '밝고 어두운 차이가 큰 조합',
        value: 'high',
        weights: { contrast: 0.7, clarity: 0.15 },
        swatches: ['#111111', '#FFFFFF', '#111111', '#FFFFFF'],
        swatchCaption: '블랙 · 화이트처럼 대비가 큰 조합',
      },
      {
        label: '비슷한 밝기로 이어지는 조합',
        value: 'low',
        weights: { contrast: -0.7, clarity: -0.15 },
        swatches: ['#DAD1C6', '#EFE8DF', '#CFC6BD', '#E3DBD2'],
        swatchCaption: '비슷한 명도의 베이지·에크루 조합',
      },
      {
        label: '중간 정도의 차이가 있는 조합',
        value: 'mid',
        weights: { contrast: 0 },
        swatches: ['#556070', '#D7DDE5', '#9CA8B4', '#F5F7FA'],
        swatchCaption: '네이비와 라이트 그레이 정도의 중간 대비',
      },
      {
        label: '잘 모르겠어요',
        value: 'unknown',
        weights: {},
        unknown: true,
      },
    ],
  },
  {
    id: 'depth_preference',
    kind: 'signal',
    text: '어떤 밝기의 색에서 얼굴이 가장 안정적으로 보이나요?',
    helperText: '밝은 파스텔, 중간 톤, 깊고 짙은 톤 중 얼굴선이 가장 자연스럽게 살아나는 쪽을 골라 주세요.',
    options: [
      {
        label: '밝은 색',
        value: 'light',
        weights: { lightness: 0.7 },
        swatches: ['#FFF2D8', '#F8D7E8', '#DDEBFF', '#E5F5D8'],
        swatchCaption: '라이트 피치 · 베이비 핑크 · 스카이 · 민트',
      },
      {
        label: '중간 밝기의 색',
        value: 'medium',
        weights: { lightness: 0 },
        swatches: ['#D7B48D', '#C88FA9', '#7D8EA9', '#8CA59A'],
        swatchCaption: '카멜 · 로즈 · 슬레이트 블루 · 딥 민트',
      },
      {
        label: '어두운 색',
        value: 'deep',
        weights: { lightness: -0.7 },
        swatches: ['#5E3E2B', '#6D2240', '#1E2A5A', '#284131'],
        swatchCaption: '에스프레소 · 와인 · 네이비 · 포레스트',
      },
      {
        label: '잘 모르겠어요',
        value: 'unknown',
        weights: {},
        unknown: true,
      },
    ],
  },
];

export const QUESTIONNAIRE_AXES: (keyof QuestionnaireScores)[] = ['temperature', 'lightness', 'clarity', 'contrast'];
