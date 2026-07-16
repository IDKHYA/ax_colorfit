/*
 * App.tsx
 *
 * 이 파일은 통합 퍼스널컬러 AI 옷장 앱의 최상위 애플리케이션 계층입니다.
 * React SPA의 페이지 전환, localStorage 기반 영속 상태, 옷장/의류/추천/저장 코디/데일리룩 흐름을 한 곳에서 연결합니다.
 *
 * 큰 흐름은 다음과 같습니다.
 * 1. 퍼스널컬러 진단 결과(FinalResult)를 저장하고 이력을 관리합니다.
 * 2. 옷장(Wardrobe)과 의류(ClothingItem)를 localStorage에서 읽고 저장합니다.
 * 3. 카탈로그 의류와 사용자가 직접 업로드한 의류를 같은 ClothingItem 구조로 통합합니다.
 * 4. 의류 대표 HEX를 Lab 색공간으로 변환해 퍼스널컬러 팔레트와 Delta E 거리 기반 적합도 점수를 계산합니다.
 * 5. 날씨 구간, 보유 상태, 색상 조화도, 퍼스널컬러 점수를 합산해 코디 추천을 생성합니다.
 * 6. 추천 결과를 SavedOutfit으로 저장하고, Try On/데일리룩 레이어 구성으로 확장합니다.
 *
 * 의류/추천 도메인은 별도 모듈로 분리되어 있습니다.
 * 타입은 wardrobeTypes.ts, 상수는 wardrobeConstants.ts, 추천 엔진은 services/recommendationEngine.ts에 있으며,
 * 이 파일에는 화면 컴포넌트, 라우팅, localStorage 영속 상태, 가상착용(데일리룩) 로직이 남아 있습니다.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  CloudSun,
  Grid2X2,
  Home,
  List,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import PhotoAnalyzer from './components/PhotoAnalyzer';
import Questionnaire from './components/Questionnaire';
import { BackTitle, Chip, ColorTileGrid, EmptyState, InfoBox, MetricBox, PanelTitle, StatCard } from './components/common';
import { FAMILY_GUIDES, FAMILY_LABELS, PERSONAL_COLOR_MODEL_NOTE, SEASON_DETAILS } from './seasonContent';
import { TRAINING_CATALOG_ITEMS } from './data/trainingCatalog';
import type { CatalogItem } from './data/trainingCatalog';
import { useWeather } from './hooks/useWeather';
import { FinalResult } from './types';
import type {
  ClothingCategory,
  ClothingItem,
  ClothingSegmentationMeta,
  DenimWash,
  MaterialType,
  Page,
  PatternType,
  RecommendationMode,
  RecommendationWeatherBand,
  SeasonTag,
  ScoredClothingItem,
} from './wardrobeTypes';
import {
  CUTOUT_VERSION,
  SEASON_LABELS,
} from './wardrobeConstants';
import {
  buildRecommendations,
  scoreItemForPersonalColor,
} from './services/recommendationEngine';
import { INITIAL_WARDROBES, useWardrobes } from './hooks/useWardrobes';
import { useSavedOutfits } from './hooks/useSavedOutfits';
import { useAppRoute } from './hooks/useAppRoute';
import { usePersonalColor } from './hooks/usePersonalColor';
import { useManualClothing } from './hooks/useManualClothing';
import { useSeasonTheme } from './hooks/useSeasonTheme';
import { HomeDashboard } from './features/home/HomeDashboard';
import { WardrobeSection } from './features/wardrobe/WardrobeSection';
import { RecommendationDashboard } from './features/recommendation/RecommendationDashboard';
import { AnchorOutfitFinder } from './features/recommendation/AnchorOutfitFinder';
import { SavedOutfits } from './features/saved-outfits/SavedOutfits';
import { TryOn } from './features/try-on/TryOn';
import { PersonalColorHistoryPanel, PersonalResult } from './features/personal/PersonalResult';
import { buildColorMeta, catalogFromAnalysis, categoryFromMeta, dominantColorFromAnalysis, normalizeSeasonTag } from './services/clothingMeta';
import { clothingDisplayImage } from './services/clothingDisplay';
import { imageUrlToUploadBlob, requestBackgroundRemoval } from './services/clothingImageApi';

// 수동으로 정의한 샘플 카탈로그 데이터를 앱 내부 CatalogItem 형태로 만듭니다.
function catalog(id: string, name: string, category: ClothingCategory, subcategory: string, color: string, size: string, brand: string, imageUrl: string): CatalogItem {
  const meta = buildColorMeta(category, subcategory, color);
  return { catalogItemId: id, name, category, subcategory, imageUrl, color, size, brand, ...meta, sourceType: 'catalog' };
}

// 이미지 분석 결과의 part 정보를 사용해 카테고리를 보정합니다.
// fallback이 액세서리로 들어온 경우에도 실제로는 하의/아우터/신발일 수 있어 여기서 정리합니다.
const INITIAL_CATALOG_ITEMS: CatalogItem[] = [
  catalog('catalog-1', '베이직 무지 화이트 반팔 티셔츠', '상의', '반팔티', '화이트', 'M', 'Fitly Basic', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-2', '오버핏 스트라이프 셔츠', '상의', '셔츠', '블루', 'M', 'Monday Label', 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-3', '블록 꼬지 터틀넥 니트', '상의', '니트', '아이보리', 'S', 'Soft Day', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-4', '파스텔 크롭 가디건', '상의', '가디건', '핑크', 'S', 'Cotton Room', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-5', '빈티지 그래픽 맨투맨', '상의', '맨투맨', '블랙', 'L', 'Graphic Lab', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-6', '스트레이트 핏 연청 데님', '하의', '청바지', '데님', '28', 'Denim Standard', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-7', '와이드 핀턱 슬랙스', '하의', '슬랙스', '블랙', '29', 'Office Form', 'https://images.unsplash.com/photo-1506629905607-d9c297d4c040?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-8', '치노 숏 팬츠', '하의', '반바지', '베이지', '28', 'Sunny Wear', 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-9', '롱 플리츠 스커트', '하의', '스커트', '카키', 'M', 'Calm Line', 'https://images.unsplash.com/photo-1583496661160-fb5886a13d27?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-10', '생지 데님 팬츠', '하의', '청바지', '데님', '29', 'Denim Standard', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-11', '싱글 버튼 오버핏 블레이저', '아우터', '블레이저', '브라운', 'M', 'Office Form', 'https://images.unsplash.com/photo-1551489186-cf8726f514f8?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-12', '클래식 비건 레더 자켓', '아우터', '재킷', '블랙', 'M', 'Monday Label', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-13', '베이직 트렌치 코트', '아우터', '트렌치코트', '베이지', 'M', 'Soft Day', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-14', '루즈핏 청자켓', '아우터', '재킷', '데님', 'M', 'Denim Standard', 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-15', '경량 필딩 자켓', '아우터', '재킷', '카키', 'L', 'Daily Layer', 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=700&q=80'),
  catalog('catalog-16', '화이트 스니커즈', '신발', '스니커즈', '화이트', '270', 'Clean Step', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80'),
];

const ACTIVE_CATALOG_ITEMS = TRAINING_CATALOG_ITEMS;

// 기준 옷 코디 찾기에서 카탈로그 후보 풀에 부여하는 가상 옷장 id입니다.
// 옷장(보유) 아이템과 출처를 구분하고, 카탈로그 아이템끼리 id가 안정적으로 유지되게 합니다.
const ANCHOR_CATALOG_POOL_ID = 'anchor-catalog-pool';

// 카탈로그 상품을 사용자의 특정 옷장에 들어가는 실제 ClothingItem으로 복사합니다.
// 같은 카탈로그라도 옷장별로 별도 id를 갖게 해 삭제/상태 변경을 독립적으로 처리합니다.
function fromCatalog(item: CatalogItem, wardrobeId: string): ClothingItem {
  return {
    id: `c-${wardrobeId}-${item.catalogItemId}`,
    wardrobeId,
    imageUrl: item.imageUrl,
    category: item.category,
    type: item.subcategory,
    color: item.color,
    size: item.size,
    brand: item.brand,
    createdAt: new Date().toISOString(),
    representativeColor: item.representativeColor,
    representativeHex: item.representativeHex,
    dominantColors: item.dominantColors,
    seasonTag: normalizeSeasonTag(item.seasonTag),
    patternType: item.patternType,
    material: item.material,
    availabilityStatus: '보유중',
    isNeutral: item.isNeutral,
    isDenim: item.isDenim,
    denimWash: item.denimWash,
    sourceType: 'catalog',
    catalogItemId: item.catalogItemId,
  };
}

// 카탈로그 원본에는 앞서 계산해 둔 catalogItemId 기준 누끼 결과(있다면)를 덧씌운다.
// 이 풀의 아이템은 실제 옷장(clothingItems)에 없으므로 cutoutImageUrl을 세션 캐시로 따로 들고 있어야 한다.
const CATALOG_DAILYLOOK_PREFIX = 'catalog-dailylook-';

interface CatalogCutoutEntry {
  cutoutImageUrl: string;
  segmentation: ClothingSegmentationMeta;
  color: string;
  representativeColor: string;
  representativeHex: string;
  dominantColors: ClothingItem['dominantColors'];
  patternType: PatternType;
  material: MaterialType;
  isNeutral: boolean;
  isDenim: boolean;
  denimWash?: DenimWash;
}

function catalogToDailyLookItem(item: CatalogItem, cutoutCache: Record<string, CatalogCutoutEntry>): ScoredClothingItem {
  const base = fromCatalog(item, 'catalog-dailylook');
  const cached = cutoutCache[item.catalogItemId];
  return {
    ...base,
    ...(cached
      ? {
          imageUrl: cached.cutoutImageUrl,
          cutoutImageUrl: cached.cutoutImageUrl,
          originalImageUrl: base.imageUrl,
          segmentation: cached.segmentation,
          color: cached.color,
          representativeColor: cached.representativeColor,
          representativeHex: cached.representativeHex,
          dominantColors: cached.dominantColors,
          patternType: cached.patternType,
          material: cached.material,
          isNeutral: cached.isNeutral,
          isDenim: cached.isDenim,
          denimWash: cached.denimWash,
        }
      : {}),
    id: `catalog-dailylook-${item.catalogItemId}`,
    personalFitScore: null,
    fitGrade: null,
    fitReason: '카탈로그에서 데일리룩 만들기에 추가한 아이템입니다.',
    avoidRisk: false,
  };
}

// 모바일 레이아웃/카메라 처리 분기를 위한 viewport 검사입니다.
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
}

// ColorFit 프로토타입의 data-title/data-subtitle 계약 — 탑바에 표시할 화면별 제목입니다.
const SCREEN_META: Record<string, { title: string; subtitle: string }> = {
  home: { title: '오늘의 ColorFit', subtitle: '상태에 맞는 다음 행동을 보여줍니다' },
  'personal-capture': { title: '퍼컬 진단', subtitle: '사진과 설문을 함께 사용합니다' },
  'personal-questionnaire': { title: '퍼컬 설문', subtitle: '사진 결과를 안정적으로 보정합니다' },
  'personal-result': { title: '퍼컬 결과', subtitle: '12계절 스펙트럼과 옷장 활용 색상을 함께 보여줍니다' },
  wardrobe: { title: '옷장', subtitle: '목적별 옷장을 관리합니다' },
  'wardrobe-detail': { title: '옷장', subtitle: '보유한 옷을 관리합니다' },
  catalog: { title: '카탈로그에서 고르기', subtitle: '준비된 옷 중 필요한 아이템을 선택합니다' },
  'catalog-preview': { title: '선택 미리보기', subtitle: '저장할 옷과 대상 옷장을 확인합니다' },
  add: { title: '옷 추가', subtitle: '사진 분석 후 필요한 정보만 수정합니다' },
  recommend: { title: '오늘의 추천', subtitle: '퍼컬·날씨·조화·안정성을 함께 봅니다' },
  saved: { title: '룩 보관함', subtitle: '저장한 코디를 모아봅니다' },
  daily: { title: '데일리룩 편집', subtitle: '옷을 배치하고 한 장의 룩 이미지로 완성합니다' },
  settings: { title: '설정', subtitle: '저장 데이터와 앱 환경을 관리합니다' },
};

// 앱의 최상위 상태 컨테이너입니다.
// 퍼스널컬러 결과, 옷장/의류, 추천 코디, 저장 코디, 라우팅 상태를 여기서 관리하고 하위 화면에 props로 내려줍니다.
function App() {
  const { setPhotoData, personalColorResult, personalColorHistory, completeQuestionnaire, applyPersonalColorRecord, resetPersonalColor } = usePersonalColor();
  const { wardrobes, clothingItems, selectedWardrobeId, setSelectedWardrobeId, scoredItems, activeWardrobe, activeItems, persistClothing, createWardrobe, deleteClothing, renameWardrobe, deleteWardrobe, resetWardrobes, updateClothingItems } = useWardrobes(personalColorResult, ACTIVE_CATALOG_ITEMS);
  const { page, analysisStep, setAnalysisStep, wardrobeView, navigate, goPage, goBack } = useAppRoute(
    selectedWardrobeId,
    setSelectedWardrobeId,
    wardrobes[0]?.id ?? INITIAL_WARDROBES[0].id,
  );
  const [catalogCategory, setCatalogCategory] = useState<'전체' | ClothingCategory>('전체');
  const [detailCategory, setDetailCategory] = useState<'전체' | ClothingCategory>('전체');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [catalogSaveMode, setCatalogSaveMode] = useState<'create' | 'append'>('append');
  const [newWardrobeName, setNewWardrobeName] = useState('나의 새 옷장');
  const [wardrobeSearch, setWardrobeSearch] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailLayout, setDetailLayout] = useState<'grid' | 'list'>('grid');
  const [recommendMode, setRecommendMode] = useState<RecommendationMode>('데일리');
  const [recommendSearch, setRecommendSearch] = useState('');
  const [recommendRequested, setRecommendRequested] = useState(false);
  const [selectedRecommendWardrobes, setSelectedRecommendWardrobes] = useState<Set<string>>(() => new Set(INITIAL_WARDROBES.map((item) => item.id)));
  const weatherState = useWeather();
  const [weatherBand, setWeatherBand] = useState<RecommendationWeatherBand>('20~22도');
  const [weatherTouched, setWeatherTouched] = useState(false);
  const { manual, setManual, urlImport, setUrlImport, fileInputRef, cameraInputRef, backgroundRemoveStatus, backgroundRemoveError, handleFileChange, removeManualBackground, extractManualClothingPrecisely, analyzeUrlImport, adoptUrlImage, handleManualCategory } = useManualClothing();

  useEffect(() => {
    if (!weatherTouched && weatherState.data) setWeatherBand(weatherState.data.weatherBand);
  }, [weatherState.data, weatherTouched]);

  useEffect(() => {
    if (!wardrobes.some((wardrobe) => wardrobe.id === selectedWardrobeId)) {
      setSelectedWardrobeId(wardrobes[0]?.id ?? '');
    }
    setSelectedRecommendWardrobes((prev) => {
      const next = new Set([...prev].filter((id) => wardrobes.some((wardrobe) => wardrobe.id === id)));
      if (next.size === 0) wardrobes.forEach((wardrobe) => next.add(wardrobe.id));
      return next;
    });
  }, [selectedWardrobeId, wardrobes]);

  const [catalogCutoutCache, setCatalogCutoutCache] = useState<Record<string, CatalogCutoutEntry>>({});
  const dailyLookSourceItems = useMemo(
    () => [...scoredItems, ...ACTIVE_CATALOG_ITEMS.map((item) => catalogToDailyLookItem(item, catalogCutoutCache))],
    [scoredItems, catalogCutoutCache],
  );
  const { savedOutfits, savedLookFolders, activeTryOnOutfitId, saveOutfit, deleteSavedOutfit, updateSavedOutfitDailyLook, createBlankDailyLook: createBlankDailyLookState, createSavedLookFolder, renameSavedLookFolder, deleteSavedLookFolder, moveSavedOutfit, toggleSavedOutfitFavorite, openDailyLookMaker: setActiveDailyLook, resetSavedOutfits } = useSavedOutfits(dailyLookSourceItems);
  const filteredCatalog = catalogCategory === '전체' ? ACTIVE_CATALOG_ITEMS : ACTIVE_CATALOG_ITEMS.filter((item) => item.category === catalogCategory);
  const selectedCatalogItems = ACTIVE_CATALOG_ITEMS.filter((item) => selectedCatalogIds.includes(item.catalogItemId));
  const recommendItems = scoredItems.filter((item) => selectedRecommendWardrobes.has(item.wardrobeId));
  const recommendations = useMemo(() => buildRecommendations(recommendItems, weatherBand, recommendMode, personalColorResult), [recommendItems, weatherBand, recommendMode, personalColorResult]);

  // 기준 옷 코디 찾기. 카탈로그 전체를 퍼스널컬러 점수까지 매겨 후보 풀로 만들어 두고(memo), 옷장 풀과 함께 넘긴다.
  const anchorCatalogPool = useMemo(
    () => ACTIVE_CATALOG_ITEMS.map((item) => scoreItemForPersonalColor(fromCatalog(item, ANCHOR_CATALOG_POOL_ID), personalColorResult)),
    [personalColorResult],
  );
  const [anchorItem, setAnchorItem] = useState<ScoredClothingItem | null>(null);

  // ColorFit 셸 — 현재 라우트 키(프로토타입 data-screen 규약)와 탑바 제목을 계산합니다.
  const route = page === 'personal'
    ? (analysisStep === 'photo' ? 'personal-capture' : analysisStep === 'questionnaire' ? 'personal-questionnaire' : 'personal-result')
    : page === 'wardrobe'
      ? (wardrobeView === 'list' ? 'wardrobe' : wardrobeView === 'detail' ? 'wardrobe-detail' : wardrobeView === 'catalog' ? 'catalog' : wardrobeView === 'preview' ? 'catalog-preview' : 'add')
      : page === 'tryon' ? 'daily' : page;
  const screenMeta = SCREEN_META[route] ?? SCREEN_META.home;
  const screenTitle = route === 'wardrobe-detail' && activeWardrobe ? activeWardrobe.name : screenMeta.title;
  const screenSubtitle = route === 'wardrobe-detail' ? `${activeItems.length}벌 보유` : screenMeta.subtitle;

  // 퍼컬 화면에서는 크로마틱 모드(리퀴드 글래스 강화)를 켜고, 라우트를 body에 기록해 화면별 배경 연출을 잇습니다.
  useEffect(() => {
    document.body.dataset.route = route;
    document.body.classList.toggle('chromatic-mode', page === 'personal');
  }, [route, page]);
  useSeasonTheme(personalColorResult);

  const completeQuestionnaireAndNavigate = (scores: Parameters<typeof completeQuestionnaire>[0], rawResponses: Parameters<typeof completeQuestionnaire>[1]) => {
    if (completeQuestionnaire(scores, rawResponses)) navigate({ page: 'personal', analysisStep: 'result' });
  };

  const saveCatalogSelection = () => {
    if (selectedCatalogIds.length === 0) return;
    const targetWardrobeId = catalogSaveMode === 'create' ? createWardrobe(newWardrobeName.trim() || '나의 새 옷장') : activeWardrobe?.id;
    if (!targetWardrobeId) return;
    const existingCatalogIds = new Set(clothingItems.filter((item) => item.wardrobeId === targetWardrobeId).map((item) => item.catalogItemId));
    const additions = selectedCatalogItems
      .filter((item) => !existingCatalogIds.has(item.catalogItemId))
      .map((item) => fromCatalog(item, targetWardrobeId));
    persistClothing([...clothingItems, ...additions]);
    setSelectedCatalogIds([]);
    navigate({ page: 'wardrobe', wardrobeView: 'detail', selectedWardrobeId: targetWardrobeId }, { replace: true });
    setCatalogSaveMode('append');
  };

  const addManualItem = () => {
    if (!activeWardrobe) return;
    const detectedColor = dominantColorFromAnalysis(manual.segmentation?.colors);
    const meta = buildColorMeta(manual.category, manual.type, manual.color, manual.segmentation?.colors, manual.brand);
    const item: ClothingItem = {
      id: `manual-${Date.now()}`,
      wardrobeId: activeWardrobe.id,
      imageUrl: manual.cutoutImageUrl || manual.imageUrl || 'https://images.unsplash.com/photo-1648483098902-7af8f711498f?auto=format&fit=crop&w=700&q=80',
      originalImageUrl: manual.originalImageUrl || manual.imageUrl || undefined,
      cutoutImageUrl: manual.cutoutImageUrl || undefined,
      segmentation: manual.segmentation ?? undefined,
      category: manual.category,
      type: manual.type,
      color: manual.color,
      size: manual.size,
      brand: manual.brand || '직접 등록',
      createdAt: new Date().toISOString(),
      representativeColor: meta.representativeColor,
      representativeHex: detectedColor?.hex ?? meta.representativeHex,
      dominantColors: meta.dominantColors,
      seasonTag: ((manual.predictedSeasonTag && manual.predictedSeasonTag !== '미분류')
        ? manual.predictedSeasonTag
        : manual.seasonTag) as SeasonTag,
      patternType: meta.patternType,
      material: (manual.predictedMaterial as MaterialType | null) ?? meta.material,
      availabilityStatus: manual.availabilityStatus,
      isNeutral: meta.isNeutral,
      isDenim: meta.isDenim,
      denimWash: meta.denimWash,
      sourceType: manual.sourceType,
      sourceRef: manual.sourceRef || undefined,
    };
    persistClothing([...clothingItems, item]);
    navigate({ page: 'wardrobe', wardrobeView: 'detail' }, { replace: true });
  };

  const createBlankDailyLook = () => {
    createBlankDailyLookState();
    navigate({ page: 'tryon' });
  };

  const openDailyLookMaker = (id: string) => {
    setActiveDailyLook(id);
    navigate({ page: 'tryon' });
  };

  const openWardrobeFromDailyLook = (wardrobeId: string) => {
    navigate({ page: 'wardrobe', selectedWardrobeId: wardrobeId, wardrobeView: 'detail' });
  };

  const ensureDailyLookCutouts = async (itemIds: string[]) => {
    const targets = clothingItems.filter((item) => itemIds.includes(item.id) && (!item.cutoutImageUrl || item.segmentation?.version !== CUTOUT_VERSION));
    for (const item of targets) {
      try {
        const sourceUrl = item.originalImageUrl || item.imageUrl;
        const sourceBlob = await imageUrlToUploadBlob(sourceUrl);
        const result = await requestBackgroundRemoval(sourceBlob, `${item.id}.png`);
        const detectedColor = dominantColorFromAnalysis(result.colors);
        const nextColor = detectedColor?.hex ?? item.color;
        const nextMeta = buildColorMeta(item.category, item.type, nextColor, result.colors, item.brand);
        updateClothingItems((prev) => {
          const next = prev.map((entry) => entry.id === item.id ? {
            ...entry,
            imageUrl: result.imageDataUrl,
            cutoutImageUrl: result.imageDataUrl,
            originalImageUrl: entry.originalImageUrl || sourceUrl,
            segmentation: {
              width: result.width,
              height: result.height,
              bbox: result.bbox,
              colors: result.colors ?? [],
              model: result.model,
              version: result.version ?? CUTOUT_VERSION,
              processedAt: result.processedAt,
            },
            color: nextColor,
            representativeColor: nextMeta.representativeColor,
            representativeHex: detectedColor?.hex ?? nextMeta.representativeHex,
            dominantColors: nextMeta.dominantColors,
            patternType: nextMeta.patternType,
            material: nextMeta.material,
            isNeutral: nextMeta.isNeutral,
            isDenim: nextMeta.isDenim,
            denimWash: nextMeta.denimWash,
          } : entry);
          return next;
        });
      } catch (error) {
        throw new Error(`${item.type} 누끼 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    // "카탈로그에서 데일리룩 만들기"로 추가한 아이템은 실제 옷장(clothingItems)에 없어 위 목록에 잡히지 않는다.
    // catalogItemId 기준 세션 캐시(catalogCutoutCache)에 결과를 따로 저장한다.
    const catalogTargetIds = itemIds
      .filter((id) => id.startsWith(CATALOG_DAILYLOOK_PREFIX))
      .map((id) => id.slice(CATALOG_DAILYLOOK_PREFIX.length))
      .filter((catalogItemId) => !catalogCutoutCache[catalogItemId]);
    const catalogTargets = catalogTargetIds
      .map((catalogItemId) => ACTIVE_CATALOG_ITEMS.find((item) => item.catalogItemId === catalogItemId))
      .filter((item): item is CatalogItem => Boolean(item));

    for (const item of catalogTargets) {
      try {
        const sourceBlob = await imageUrlToUploadBlob(item.imageUrl);
        const result = await requestBackgroundRemoval(sourceBlob, `${item.catalogItemId}.png`);
        const detectedColor = dominantColorFromAnalysis(result.colors);
        const nextColor = detectedColor?.hex ?? item.color;
        const nextMeta = buildColorMeta(item.category, item.subcategory, nextColor, result.colors, item.brand);
        setCatalogCutoutCache((prev) => ({
          ...prev,
          [item.catalogItemId]: {
            cutoutImageUrl: result.imageDataUrl,
            segmentation: {
              width: result.width,
              height: result.height,
              bbox: result.bbox,
              colors: result.colors ?? [],
              model: result.model,
              version: result.version ?? CUTOUT_VERSION,
              processedAt: result.processedAt,
            },
            color: nextColor,
            representativeColor: nextMeta.representativeColor,
            representativeHex: detectedColor?.hex ?? nextMeta.representativeHex,
            dominantColors: nextMeta.dominantColors,
            patternType: nextMeta.patternType,
            material: nextMeta.material,
            isNeutral: nextMeta.isNeutral,
            isDenim: nextMeta.isDenim,
            denimWash: nextMeta.denimWash,
          },
        }));
      } catch (error) {
        throw new Error(`${item.subcategory} 누끼 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }
  };

  const resetAllData = () => {
    resetPersonalColor();
    setAnalysisStep('photo');
    resetWardrobes();
    resetSavedOutfits();
  };

  const openCatalog = (mode: 'create' | 'append') => {
    setCatalogSaveMode(mode);
    setSelectedCatalogIds([]);
    setCatalogCategory('전체');
    navigate({ page: 'wardrobe', wardrobeView: 'catalog' });
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} go={goPage} personalColorResult={personalColorResult} />
      <header className="mobile-header">
        {page === 'home' ? <span className="mobile-header-spacer" aria-hidden="true" /> : <button className="button icon-only ghost" type="button" onClick={goBack} aria-label="뒤로"><ArrowLeft className="icon" /></button>}
        <button className="brand mobile-brand" type="button" onClick={() => goPage('home')}><img className="brand-mark" src="/icons/colorfit-app-icon.png" alt="" aria-hidden="true" /><span>ColorFit</span></button>
        <button className="button icon-only ghost" type="button" onClick={() => goPage('settings')} aria-label="설정"><User className="icon" /></button>
      </header>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-copy"><span><strong>{screenTitle}</strong><small>{screenSubtitle}</small></span></div>
          <div className="top-actions">
            <button className="button secondary" type="button" onClick={() => navigate({ page: 'wardrobe', wardrobeView: 'manual' })}><Plus className="icon" />옷 추가</button>
            <button className="button icon-only secondary" type="button" onClick={() => goPage('settings')} aria-label="프로필"><User className="icon" /></button>
          </div>
        </header>
        <section className="screen active" data-screen={route}>
          {page === 'home' && (
            <HomeDashboard
              personalColorResult={personalColorResult}
              wardrobes={wardrobes}
              scoredItems={scoredItems}
              savedOutfits={savedOutfits}
              weather={weatherState.data}
              weatherLoading={weatherState.loading}
              weatherError={weatherState.error}
              weatherSource={weatherState.source}
              weatherBand={weatherBand}
              refreshWeather={weatherState.refresh}
              recommendationCount={recommendations.length}
              go={goPage}
              openPersonal={() => navigate({ page: 'personal', analysisStep: personalColorResult ? 'result' : 'photo' })}
              openManual={() => navigate({ page: 'wardrobe', wardrobeView: 'manual' })}
            />
          )}

          {page === 'personal' && (
            <section className="personal-route">
              {analysisStep === 'photo' && (
                <>
                  <div className="page-head">
                    <div className="page-head-copy"><span className="page-kicker">Step 1 of 3</span><h1>얼굴 사진 촬영</h1><p>얼굴과 흰 종이를 가이드에 맞추면 색상 분석을 시작합니다.</p></div>
                    <button className="button secondary" type="button" onClick={() => goPage('home')}>진단 나가기</button>
                  </div>
                  <PhotoAnalyzer onAnalysisComplete={(result) => { setPhotoData(result); navigate({ page: 'personal', analysisStep: 'questionnaire' }); }} />
                </>
              )}
              {analysisStep === 'questionnaire' && (
                <>
                  <div className="page-head"><div className="page-head-copy"><span className="page-kicker">Step 2 of 3</span><h1>색 반응 설문</h1><p>평소 잘 받았던 색의 인상을 골라 사진 결과를 보정합니다.</p></div></div>
                  <Questionnaire onComplete={completeQuestionnaireAndNavigate} />
                </>
              )}
              {analysisStep === 'result' && personalColorResult && (
                <PersonalResult
                  result={personalColorResult}
                  onRetry={() => navigate({ page: 'personal', analysisStep: 'photo' })}
                  onOpenWardrobe={() => navigate({ page: 'wardrobe', wardrobeView: 'list' })}
                />
              )}
            </section>
          )}

          {page === 'wardrobe' && (
            <WardrobeSection
              view={wardrobeView}
              setView={(view) => navigate({ page: 'wardrobe', wardrobeView: view })}
              onBack={goBack}
              wardrobes={wardrobes}
              activeWardrobe={activeWardrobe}
              personalColorResult={personalColorResult}
              allItems={scoredItems}
              activeItems={activeItems}
              wardrobeSearch={wardrobeSearch}
              setWardrobeSearch={setWardrobeSearch}
              detailSearch={detailSearch}
              setDetailSearch={setDetailSearch}
              detailCategory={detailCategory}
              setDetailCategory={setDetailCategory}
              detailLayout={detailLayout}
              setDetailLayout={setDetailLayout}
              catalogItems={filteredCatalog}
              catalogCategory={catalogCategory}
              setCatalogCategory={setCatalogCategory}
              selectedCatalogIds={selectedCatalogIds}
              setSelectedCatalogIds={setSelectedCatalogIds}
              selectedCatalogItems={selectedCatalogItems}
              catalogSaveMode={catalogSaveMode}
              setCatalogSaveMode={setCatalogSaveMode}
              newWardrobeName={newWardrobeName}
              setNewWardrobeName={setNewWardrobeName}
              onSelectWardrobe={(id) => navigate({ page: 'wardrobe', selectedWardrobeId: id, wardrobeView: 'detail' })}
              onRenameWardrobe={renameWardrobe}
              onDeleteWardrobe={deleteWardrobe}
              onDeleteItem={deleteClothing}
              onOpenCatalog={openCatalog}
              onSaveCatalog={saveCatalogSelection}
              onRecommend={() => {
                if (activeWardrobe) setSelectedRecommendWardrobes(new Set([activeWardrobe.id]));
                setRecommendRequested(true);
                navigate({ page: 'recommend' });
              }}
              manual={manual}
              setManual={setManual}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
              onFileChange={handleFileChange}
              onRemoveBackground={removeManualBackground}
              onPrecisionExtract={extractManualClothingPrecisely}
              backgroundRemoveStatus={backgroundRemoveStatus}
              backgroundRemoveError={backgroundRemoveError}
              onCategory={handleManualCategory}
              onSaveManual={addManualItem}
              onFindOutfits={setAnchorItem}
              urlImport={urlImport}
              setUrlImport={setUrlImport}
              onAnalyzeUrl={analyzeUrlImport}
              onAdoptUrlImage={adoptUrlImage}
            />
          )}

          {page === 'recommend' && (
            !personalColorResult ? (
              <section className="page-stack">
                <BackTitle title="AI 옷장 추천" description="실시간 날씨와 퍼스널컬러, 상황을 함께 반영합니다." onBack={goBack} />
                <EmptyState title="퍼스널 컬러 측정이 필요합니다." description="추천은 측정 결과가 저장된 뒤 활성화됩니다." action={<button className="black-button" type="button" onClick={() => navigate({ page: 'personal', analysisStep: 'photo' })}>측정하러 가기</button>} />
              </section>
            ) : (
              <RecommendationDashboard
                personalColorResult={personalColorResult}
                wardrobes={wardrobes}
                items={scoredItems}
                selectedWardrobes={selectedRecommendWardrobes}
                setSelectedWardrobes={setSelectedRecommendWardrobes}
                search={recommendSearch}
                setSearch={setRecommendSearch}
                mode={recommendMode}
                setMode={(value) => { setRecommendMode(value); setRecommendRequested(false); }}
                weatherBand={weatherBand}
                setWeatherBand={(value) => { setWeatherTouched(true); setWeatherBand(value); setRecommendRequested(false); }}
                weather={weatherState.data}
                weatherLoading={weatherState.loading}
                weatherError={weatherState.error}
                weatherSource={weatherState.source}
                refreshWeather={weatherState.refresh}
                recommendations={recommendations}
                requested={recommendRequested}
                setRequested={setRecommendRequested}
                onSave={saveOutfit}
                onBack={goBack}
              />
            )
          )}

          {page === 'saved' && <SavedOutfits saved={savedOutfits} folders={savedLookFolders} items={dailyLookSourceItems} wardrobes={wardrobes} onDelete={deleteSavedOutfit} onMakeDailyLook={openDailyLookMaker} onCreateDailyLook={createBlankDailyLook} onCreateFolder={createSavedLookFolder} onRenameFolder={renameSavedLookFolder} onDeleteFolder={deleteSavedLookFolder} onMoveToFolder={moveSavedOutfit} onToggleFavorite={toggleSavedOutfitFavorite} onOpenWardrobe={openWardrobeFromDailyLook} />}
          {page === 'tryon' && <TryOn saved={savedOutfits} items={dailyLookSourceItems} wardrobes={wardrobes} activeOutfitId={activeTryOnOutfitId} onSaveDailyLook={updateSavedOutfitDailyLook} onEnsureCutouts={ensureDailyLookCutouts} onBack={() => goPage('saved')} />}
          {page === 'settings' && (
            <section className="settings-page">
              <div className="page-head">
                <div className="page-head-copy"><span className="page-kicker">Preferences</span><h1>설정</h1><p>현재 프로필과 저장 데이터를 확인하고 필요한 항목만 관리합니다.</p></div>
              </div>
              <div className="settings-layout">
                <section className="panel">
                  <div className="section-head"><div><h2>내 프로필</h2><small>퍼컬과 보관 현황</small></div></div>
                  <div className="setting-list">
                    <div className="setting-row"><span><strong>퍼스널컬러</strong><small>{personalColorResult ? '현재 적용된 진단 결과' : '아직 진단하지 않았습니다.'}</small></span><button className="button secondary" type="button" onClick={() => navigate({ page: 'personal', analysisStep: personalColorResult ? 'result' : 'photo' })}>{personalColorResult ? SEASON_LABELS[personalColorResult.seasonTop1Id] : '진단하기'}</button></div>
                    <div className="setting-row"><span><strong>저장된 옷</strong><small>{wardrobes.length}개 옷장</small></span><button className="button secondary" type="button" onClick={() => goPage('wardrobe')}>{clothingItems.length}벌</button></div>
                    <div className="setting-row"><span><strong>룩 보관함</strong><small>{savedLookFolders.length}개 폴더</small></span><button className="button secondary" type="button" onClick={() => goPage('saved')}>{savedOutfits.length}개</button></div>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-head"><div><h2>내 데이터</h2><small>초기화 작업</small></div></div>
                  <div className="setting-list">
                    <div className="setting-row"><span><strong>퍼컬 결과 초기화</strong><small>측정 결과만 지우고 옷장은 유지합니다.</small></span><button className="button secondary" type="button" onClick={() => { resetPersonalColor(); setAnalysisStep('photo'); }}><RotateCcw className="icon" />초기화</button></div>
                    <div className="setting-row"><span><strong>전체 데이터 초기화</strong><small>옷장, 저장 룩, 퍼컬 기록을 모두 지웁니다.</small></span><button className="button danger" type="button" onClick={resetAllData}><Check className="icon" />전체 초기화</button></div>
                  </div>
                </section>
              </div>
              <section className="settings-history">
                <PersonalColorHistoryPanel history={personalColorHistory} current={personalColorResult} onApply={applyPersonalColorRecord} />
              </section>
            </section>
          )}
        </section>
      </main>
      {anchorItem && (
        <AnchorOutfitFinder
          anchor={anchorItem}
          wardrobePool={scoredItems}
          catalogPool={anchorCatalogPool}
          personalColorResult={personalColorResult}
          onSave={saveOutfit}
          onClose={() => setAnchorItem(null)}
        />
      )}
      <MobileNav page={page} go={goPage} />
    </div>
  );
}

// 데스크톱 좌측 네비게이션 — ColorFit 플로팅 글래스 사이드바입니다. 진단 완료 여부를 프로필 칩에 보여줍니다.
function Sidebar({ page, go, personalColorResult }: { page: Page; go: (page: Page) => void; personalColorResult: FinalResult | null }) {
  const items: Array<[Page, string, typeof Home]> = [
    ['home', '홈', Home],
    ['personal', '퍼컬 진단', Camera],
    ['wardrobe', '옷장', Shirt],
    ['recommend', '추천', Sparkles],
    ['saved', '데일리룩', Bookmark],
    ['settings', '설정', Settings],
  ];
  return (
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => go('home')}>
        <img className="brand-mark" src="/icons/colorfit-app-icon.png" alt="" aria-hidden="true" />
        <span className="brand-copy"><strong>ColorFit</strong><small>PERSONAL COLOR WARDROBE</small></span>
      </button>
      <nav className="nav-list" aria-label="주요 화면">
        {items.map(([key, label, Icon]) => (
          <button key={key} className={`nav-button${page === key || (key === 'saved' && page === 'tryon') ? ' active' : ''}`} type="button" onClick={() => go(key)}>
            <Icon className="icon" />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button className="profile-chip" type="button" onClick={() => go('settings')}>
          <span className="avatar"><User className="icon" /></span>
          <span><strong>내 프로필</strong><small>{personalColorResult ? SEASON_LABELS[personalColorResult.seasonTop1Id] : '미측정'}</small></span>
        </button>
      </div>
    </aside>
  );
}

// 모바일 하단 네비게이션 — ColorFit 글래스 바텀 바입니다.
function MobileNav({ page, go }: { page: Page; go: (page: Page) => void }) {
  const items: Array<[Page, string, typeof Home]> = [
    ['home', '홈', Home],
    ['wardrobe', '옷장', Shirt],
    ['recommend', '추천', Sparkles],
    ['saved', '데일리룩', Bookmark],
    ['settings', '설정', Settings],
  ];
  return (
    <nav className="bottom-nav" aria-label="모바일 주요 화면">
      {items.map(([key, label, Icon]) => (
        <button key={key} className={`nav-button${page === key || (key === 'saved' && page === 'tryon') ? ' active' : ''}`} type="button" onClick={() => go(key)}>
          <Icon className="icon" />
          {label}
        </button>
      ))}
    </nav>
  );
}

export default App;
