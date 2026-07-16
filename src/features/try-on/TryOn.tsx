// 데일리룩 캔버스 편집 화면을 구성하는 컴포넌트입니다.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, BringToFront, Check, Eye, EyeOff, Maximize2, Palette, Plus, RotateCcw, RotateCw, SendToBack, Shirt, Trash2, Type } from 'lucide-react';
import { EmptyState, PageTitle, PanelTitle } from '../../components/common';
import { clothingDisplayImage } from '../../services/clothingDisplay';
import { buildDailyLookState } from '../../services/dailyLook';
import type { ClothingCategory, DailyLookLayer, DailyLookState, DailyLookTextLayer, SavedOutfit, ScoredClothingItem, Wardrobe } from '../../wardrobeTypes';
import { CATEGORY_OPTIONS, CUTOUT_VERSION } from '../../wardrobeConstants';

// 데일리룩 캔버스 배경으로 빠르게 고를 수 있는 프리셋 색상 목록입니다.
const DAILY_LOOK_BACKGROUND_PRESETS = ['#f8f9fb', '#ffffff', '#f4f1eb', '#eef3f5', '#111827'];
const DAILY_LOOK_TEXT_COLOR_PRESETS = ['#111827', '#2563eb', '#dc2626', '#059669', '#ffffff'];

const LAYER_SCALE_MIN = 0.35;
const LAYER_SCALE_MAX = 1.55;
const TEXT_FONT_MIN = 18;
const TEXT_FONT_MAX = 180;
const ROTATION_LIMIT = 25;

type CanvasPoint = { x: number; y: number };

type LayerGestureAnchor =
  | { mode: 'drag'; originX: number; originY: number; start: CanvasPoint }
  | { mode: 'pinch'; originX: number; originY: number; originScale: number; originRotation: number; startMid: CanvasPoint; startDist: number; startAngle: number };

type LayerGesture = {
  itemId: string;
  pointers: Map<number, CanvasPoint>;
  live: { x: number; y: number; scale: number; rotation: number };
  anchor: LayerGestureAnchor;
};

type TextGestureAnchor =
  | { mode: 'drag'; originX: number; originY: number; start: CanvasPoint }
  | { mode: 'pinch'; originX: number; originY: number; originFontSize: number; originRotation: number; startMid: CanvasPoint; startDist: number; startAngle: number };

type TextGesture = {
  textId: string;
  pointers: Map<number, CanvasPoint>;
  live: { x: number; y: number; fontSize: number; rotation: number };
  anchor: TextGestureAnchor;
};

export function TryOn({ saved, items, wardrobes, activeOutfitId, onSaveDailyLook, onEnsureCutouts, onBack }: { saved: SavedOutfit[]; items: ScoredClothingItem[]; wardrobes: Wardrobe[]; activeOutfitId: string | null; onSaveDailyLook: (id: string, state: DailyLookState, itemIds?: string[]) => void; onEnsureCutouts: (itemIds: string[]) => Promise<void>; onBack: () => void }) {
  const selectedOutfit = saved.find((outfit) => outfit.id === activeOutfitId) ?? saved[0];
  const itemLookup = useMemo(() => new Map<string, ScoredClothingItem>(items.map((item) => [item.id, item])), [items]);
  const [draftItemIds, setDraftItemIds] = useState<string[]>(() => selectedOutfit?.itemIds ?? []);
  const dailyLookItems = useMemo(() => draftItemIds.map((id) => itemLookup.get(id)).filter(Boolean) as ScoredClothingItem[], [draftItemIds, itemLookup]);
  const [state, setState] = useState<DailyLookState>(() => buildDailyLookState(dailyLookItems, selectedOutfit?.dailyLookState));
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  // 모바일에서 자산(사용 옷) 패널을 하단 시트 서랍으로 열고 닫는 상태입니다. 편집 도구는 더 이상 별도 드로어가 아니라 캔버스 위 미니 툴바입니다.
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [bgPopoverOpen, setBgPopoverOpen] = useState(false);
  const [textPopover, setTextPopover] = useState<'edit' | 'color' | null>(null);
  const [pickerSource, setPickerSource] = useState<'wardrobe' | 'catalog'>('wardrobe');
  const [pickerWardrobeId, setPickerWardrobeId] = useState(wardrobes[0]?.id ?? '');
  const [pickerCategory, setPickerCategory] = useState<'전체' | ClothingCategory>('전체');
  const [pickerSeason, setPickerSeason] = useState('전체');
  const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<string>>(new Set());
  const [cutoutStatus, setCutoutStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [cutoutError, setCutoutError] = useState('');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const layerGestureRef = useRef<LayerGesture | null>(null);
  const textGestureRef = useRef<TextGesture | null>(null);
  const layerResizeRef = useRef<{ itemId: string; centerX: number; centerY: number; startDist: number; originScale: number } | null>(null);
  const layerRotateRef = useRef<{ itemId: string; centerX: number; centerY: number; startAngle: number; originRotation: number } | null>(null);
  const textResizeRef = useRef<{ textId: string; startX: number; originFontSize: number } | null>(null);
  const textRotateRef = useRef<{ textId: string; centerX: number; centerY: number; startAngle: number; originRotation: number } | null>(null);
  const cutoutRequestKeyRef = useRef('');
  const canvasFrameRef = useRef<number | null>(null);
  const pendingCanvasUpdateRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    if (canvasFrameRef.current !== null) cancelAnimationFrame(canvasFrameRef.current);
  }, []);

  useEffect(() => {
    setTextPopover(null);
  }, [selectedTextId]);

  const scheduleCanvasUpdate = (update: () => void) => {
    pendingCanvasUpdateRef.current = update;
    if (canvasFrameRef.current !== null) return;
    canvasFrameRef.current = requestAnimationFrame(() => {
      canvasFrameRef.current = null;
      const pendingUpdate = pendingCanvasUpdateRef.current;
      pendingCanvasUpdateRef.current = null;
      pendingUpdate?.();
    });
  };

  useEffect(() => {
    if (!selectedOutfit) return;
    setDraftItemIds(selectedOutfit.itemIds);
    const nextItems = selectedOutfit.itemIds.map((id) => itemLookup.get(id)).filter(Boolean) as ScoredClothingItem[];
    const nextState = buildDailyLookState(nextItems, selectedOutfit.dailyLookState);
    setState(nextState);
    setSelectedLayerId(nextState.layers[0]?.itemId ?? null);
    setSelectedTextId(nextState.textLayers?.[0]?.id ?? null);
  }, [selectedOutfit?.id]);

  useEffect(() => {
    const missingItems = dailyLookItems.filter((item) => !item.cutoutImageUrl || item.segmentation?.version !== CUTOUT_VERSION);
    if (!selectedOutfit || missingItems.length === 0) {
      if (cutoutStatus === 'processing') setCutoutStatus('done');
      return;
    }
    const requestKey = `${selectedOutfit.id}:${missingItems.map((item) => item.id).join(',')}`;
    if (cutoutRequestKeyRef.current === requestKey) return;
    cutoutRequestKeyRef.current = requestKey;
    setCutoutStatus('processing');
    setCutoutError('');
    onEnsureCutouts(missingItems.map((item) => item.id))
      .then(() => setCutoutStatus('done'))
      .catch((error) => {
        setCutoutStatus('error');
        setCutoutError(error instanceof Error ? error.message : '데일리룩 누끼 처리에 실패했습니다.');
      });
  }, [cutoutStatus, dailyLookItems, onEnsureCutouts, selectedOutfit]);

  if (!selectedOutfit) {
    return <section className="page-stack"><PageTitle title="데일리룩 만들기" description="저장한 데일리룩을 이미지 조합으로 편집합니다." icon={<Bookmark />} /><EmptyState title="미리볼 데일리룩이 없습니다." description="추천에서 조합을 데일리룩으로 저장하면 이 화면에서 확인할 수 있습니다." /></section>;
  }

  const itemById = new Map<string, ScoredClothingItem>(dailyLookItems.map((item) => [item.id, item]));
  const selectedLayer = selectedLayerId ? state.layers.find((layer) => layer.itemId === selectedLayerId) : undefined;
  const selectedTextLayer = selectedTextId ? state.textLayers?.find((layer) => layer.id === selectedTextId) : undefined;
  const hasCanvasContent = dailyLookItems.length > 0 || Boolean(state.textLayers?.length);
  const selectedItemIds = new Set(draftItemIds);
  const catalogItems = items.filter((item) => item.wardrobeId === 'catalog-dailylook');
  const wardrobeItems = items.filter((item) => item.wardrobeId !== 'catalog-dailylook' && (!pickerWardrobeId || item.wardrobeId === pickerWardrobeId));
  const pickerBaseItems = pickerSource === 'catalog' ? catalogItems : wardrobeItems;
  const pickerItems = pickerBaseItems
    .filter((item) => !selectedItemIds.has(item.id))
    .filter((item) => pickerCategory === '전체' || item.category === pickerCategory)
    .filter((item) => pickerSeason === '전체' || item.seasonTag.includes(pickerSeason))
    .slice(0, pickerSource === 'catalog' ? 120 : undefined);
  const pickerWardrobeName = wardrobes.find((wardrobe) => wardrobe.id === pickerWardrobeId)?.name ?? '옷장';

  const updateLayer = (itemId: string, patch: Partial<DailyLookLayer>) => {
    setState((prev) => ({
      ...prev,
      isConfirmed: false,
      confirmedImage: undefined,
      confirmedAt: undefined,
      layers: prev.layers.map((layer) => (layer.itemId === itemId ? { ...layer, ...patch } : layer)),
    }));
  };

  const updateBackground = (background: string) => {
    const nextState: DailyLookState = { ...state, background, isConfirmed: false, confirmedImage: undefined, confirmedAt: undefined };
    setState(nextState);
    onSaveDailyLook(selectedOutfit.id, nextState, draftItemIds);
  };

  const removeLayer = (itemId: string) => {
    const nextItemIds = draftItemIds.filter((id) => id !== itemId);
    const nextState: DailyLookState = {
      ...state,
      isConfirmed: false,
      confirmedImage: undefined,
      confirmedAt: undefined,
      layers: state.layers.filter((layer) => layer.itemId !== itemId),
    };
    setState(nextState);
    setDraftItemIds(nextItemIds);
    setSelectedLayerId(null);
    onSaveDailyLook(selectedOutfit.id, nextState, nextItemIds);
  };

  const updateTextLayer = (textId: string, patch: Partial<DailyLookTextLayer>) => {
    setState((prev) => ({
      ...prev,
      isConfirmed: false,
      confirmedImage: undefined,
      confirmedAt: undefined,
      textLayers: (prev.textLayers ?? []).map((layer) => (layer.id === textId ? { ...layer, ...patch } : layer)),
    }));
  };

  const addTextLayer = () => {
    const textLayer: DailyLookTextLayer = {
      id: `text-${Date.now()}`,
      text: '오늘의 룩',
      x: 540,
      y: 170,
      fontSize: 64,
      color: '#111827',
      rotation: 0,
      zIndex: Math.max(10, ...state.layers.map((layer) => layer.zIndex), ...((state.textLayers ?? []).map((layer) => layer.zIndex))) + 1,
      visible: true,
    };
    setState((prev) => ({
      ...prev,
      isConfirmed: false,
      confirmedImage: undefined,
      confirmedAt: undefined,
      textLayers: [...(prev.textLayers ?? []), textLayer],
    }));
    setSelectedTextId(textLayer.id);
    setSelectedLayerId(null);
  };

  const addDailyLookItem = (itemId: string) => {
    const nextItemIds = Array.from(new Set([...draftItemIds, itemId]));
    const nextItems = nextItemIds.map((id) => itemLookup.get(id)).filter(Boolean) as ScoredClothingItem[];
    const nextState = buildDailyLookState(nextItems, state);
    setDraftItemIds(nextItemIds);
    setState(nextState);
    onSaveDailyLook(selectedOutfit.id, nextState, nextItemIds);
    setItemPickerOpen(false);
  };

  const batchAddDailyLookItems = () => {
    const nextItemIds = Array.from(new Set([...draftItemIds, ...pickerSelectedIds]));
    const nextItems = nextItemIds.map((id) => itemLookup.get(id)).filter(Boolean) as ScoredClothingItem[];
    const nextState = buildDailyLookState(nextItems, state);
    setDraftItemIds(nextItemIds);
    setState(nextState);
    onSaveDailyLook(selectedOutfit.id, nextState, nextItemIds);
    setPickerSelectedIds(new Set());
    setItemPickerOpen(false);
  };

  const togglePickerItem = (itemId: string) => {
    setPickerSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const resetLayout = () => {
    const nextState = buildDailyLookState(dailyLookItems);
    setState(nextState);
    setSelectedLayerId(nextState.layers[0]?.itemId ?? null);
    setSelectedTextId(nextState.textLayers?.[0]?.id ?? null);
  };

  const moveLayerOrder = (direction: 'front' | 'back') => {
    if (!selectedLayer) return;
    const zIndexes = state.layers.map((layer) => layer.zIndex);
    updateLayer(selectedLayer.itemId, { zIndex: direction === 'front' ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1 });
  };

  const moveTextLayerOrder = (direction: 'front' | 'back') => {
    if (!selectedTextLayer) return;
    const zIndexes = [...state.layers.map((layer) => layer.zIndex), ...(state.textLayers ?? []).map((layer) => layer.zIndex)];
    updateTextLayer(selectedTextLayer.id, { zIndex: direction === 'front' ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1 });
  };

  const pointerToCanvas = (event: React.PointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = rect ? state.canvas.width / rect.width : 1;
    return {
      x: (event.clientX - (rect?.left ?? 0)) * scale,
      y: (event.clientY - (rect?.top ?? 0)) * scale,
    };
  };

  // 옷 레이어: 손가락(포인터) 1개 = 이동, 같은 아이템에 2개가 닿으면 중점 이동 + 거리비 크기 + 각도차 회전을 동시에 반영한다.
  // 손가락 하나가 떨어지면 남은 손가락의 현재 위치를 새 기준으로 다시 잡아 점프 없이 드래그로 되돌아간다.
  const startLayerGesture = (event: React.PointerEvent<HTMLButtonElement>, layer: DailyLookLayer) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    const gesture = layerGestureRef.current;
    if (gesture && gesture.itemId === layer.itemId && gesture.pointers.size === 1) {
      gesture.pointers.set(event.pointerId, point);
      const [p1, p2] = Array.from(gesture.pointers.values());
      gesture.anchor = {
        mode: 'pinch',
        originX: gesture.live.x,
        originY: gesture.live.y,
        originScale: gesture.live.scale,
        originRotation: gesture.live.rotation,
        startMid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        startAngle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
      };
      return;
    }
    if (gesture && gesture.pointers.size >= 2) return;
    layerGestureRef.current = {
      itemId: layer.itemId,
      pointers: new Map([[event.pointerId, point]]),
      live: { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation },
      anchor: { mode: 'drag', originX: layer.x, originY: layer.y, start: point },
    };
    setSelectedLayerId(layer.itemId);
    setSelectedTextId(null);
  };

  const moveLayerGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = layerGestureRef.current;
    if (!gesture || !gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, pointerToCanvas(event));
    if (gesture.anchor.mode === 'drag') {
      const [point] = Array.from(gesture.pointers.values());
      gesture.live.x = gesture.anchor.originX + point.x - gesture.anchor.start.x;
      gesture.live.y = gesture.anchor.originY + point.y - gesture.anchor.start.y;
    } else {
      const [p1, p2] = Array.from(gesture.pointers.values());
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const ratio = gesture.anchor.startDist > 0 ? dist / gesture.anchor.startDist : 1;
      const deltaDeg = ((angle - gesture.anchor.startAngle) * 180) / Math.PI;
      gesture.live.x = gesture.anchor.originX + (mid.x - gesture.anchor.startMid.x);
      gesture.live.y = gesture.anchor.originY + (mid.y - gesture.anchor.startMid.y);
      gesture.live.scale = Math.max(LAYER_SCALE_MIN, Math.min(LAYER_SCALE_MAX, gesture.anchor.originScale * ratio));
      gesture.live.rotation = Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, Math.round(gesture.anchor.originRotation + deltaDeg)));
    }
    const { x, y, scale, rotation } = gesture.live;
    scheduleCanvasUpdate(() => updateLayer(gesture.itemId, { x, y, scale: Number(scale.toFixed(3)), rotation }));
  };

  const endLayerGesturePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = layerGestureRef.current;
    if (!gesture) return;
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size === 0) { layerGestureRef.current = null; return; }
    const [remaining] = Array.from(gesture.pointers.values());
    gesture.anchor = { mode: 'drag', originX: gesture.live.x, originY: gesture.live.y, start: remaining };
  };

  // 데스크톱 전용 크기 조절 핸들(마우스는 핀치를 할 수 없어 별도 병렬 상태 머신으로 유지한다).
  const startLayerResize = (event: React.PointerEvent<HTMLElement>, layer: DailyLookLayer) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    const startDist = Math.hypot(point.x - layer.x, point.y - layer.y);
    layerResizeRef.current = { itemId: layer.itemId, centerX: layer.x, centerY: layer.y, startDist, originScale: layer.scale };
    setSelectedLayerId(layer.itemId);
    setSelectedTextId(null);
  };

  const resizeLayer = (event: React.PointerEvent<HTMLElement>) => {
    const resize = layerResizeRef.current;
    if (!resize) return;
    event.stopPropagation();
    const point = pointerToCanvas(event);
    const dist = Math.hypot(point.x - resize.centerX, point.y - resize.centerY);
    const ratio = resize.startDist > 0 ? dist / resize.startDist : 1;
    const nextScale = Math.max(LAYER_SCALE_MIN, Math.min(LAYER_SCALE_MAX, resize.originScale * ratio));
    scheduleCanvasUpdate(() => updateLayer(resize.itemId, { scale: Number(nextScale.toFixed(3)) }));
  };

  const endLayerResize = () => {
    layerResizeRef.current = null;
  };

  const startLayerRotate = (event: React.PointerEvent<HTMLElement>, layer: DailyLookLayer) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    const startAngle = Math.atan2(point.y - layer.y, point.x - layer.x);
    layerRotateRef.current = { itemId: layer.itemId, centerX: layer.x, centerY: layer.y, startAngle, originRotation: layer.rotation };
    setSelectedLayerId(layer.itemId);
    setSelectedTextId(null);
  };

  const rotateLayer = (event: React.PointerEvent<HTMLElement>) => {
    const rotate = layerRotateRef.current;
    if (!rotate) return;
    event.stopPropagation();
    const point = pointerToCanvas(event);
    const angle = Math.atan2(point.y - rotate.centerY, point.x - rotate.centerX);
    const deltaDeg = ((angle - rotate.startAngle) * 180) / Math.PI;
    const nextRotation = Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, Math.round(rotate.originRotation + deltaDeg)));
    scheduleCanvasUpdate(() => updateLayer(rotate.itemId, { rotation: nextRotation }));
  };

  const endLayerRotate = () => {
    layerRotateRef.current = null;
  };

  // 텍스트 레이어: 옷 레이어와 동일한 통합 제스처. scale 대신 fontSize를 구동한다.
  const startTextGesture = (event: React.PointerEvent<HTMLElement>, layer: DailyLookTextLayer) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    const gesture = textGestureRef.current;
    if (gesture && gesture.textId === layer.id && gesture.pointers.size === 1) {
      gesture.pointers.set(event.pointerId, point);
      const [p1, p2] = Array.from(gesture.pointers.values());
      gesture.anchor = {
        mode: 'pinch',
        originX: gesture.live.x,
        originY: gesture.live.y,
        originFontSize: gesture.live.fontSize,
        originRotation: gesture.live.rotation,
        startMid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        startAngle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
      };
      return;
    }
    if (gesture && gesture.pointers.size >= 2) return;
    textGestureRef.current = {
      textId: layer.id,
      pointers: new Map([[event.pointerId, point]]),
      live: { x: layer.x, y: layer.y, fontSize: layer.fontSize, rotation: layer.rotation },
      anchor: { mode: 'drag', originX: layer.x, originY: layer.y, start: point },
    };
    setSelectedTextId(layer.id);
    setSelectedLayerId(null);
  };

  const moveTextGesture = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = textGestureRef.current;
    if (!gesture || !gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, pointerToCanvas(event));
    if (gesture.anchor.mode === 'drag') {
      const [point] = Array.from(gesture.pointers.values());
      gesture.live.x = gesture.anchor.originX + point.x - gesture.anchor.start.x;
      gesture.live.y = gesture.anchor.originY + point.y - gesture.anchor.start.y;
    } else {
      const [p1, p2] = Array.from(gesture.pointers.values());
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const ratio = gesture.anchor.startDist > 0 ? dist / gesture.anchor.startDist : 1;
      const deltaDeg = ((angle - gesture.anchor.startAngle) * 180) / Math.PI;
      gesture.live.x = gesture.anchor.originX + (mid.x - gesture.anchor.startMid.x);
      gesture.live.y = gesture.anchor.originY + (mid.y - gesture.anchor.startMid.y);
      gesture.live.fontSize = Math.max(TEXT_FONT_MIN, Math.min(TEXT_FONT_MAX, gesture.anchor.originFontSize * ratio));
      gesture.live.rotation = Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, Math.round(gesture.anchor.originRotation + deltaDeg)));
    }
    const { x, y, fontSize, rotation } = gesture.live;
    scheduleCanvasUpdate(() => updateTextLayer(gesture.textId, { x, y, fontSize: Math.round(fontSize), rotation }));
  };

  const endTextGesturePointer = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = textGestureRef.current;
    if (!gesture) return;
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size === 0) { textGestureRef.current = null; return; }
    const [remaining] = Array.from(gesture.pointers.values());
    gesture.anchor = { mode: 'drag', originX: gesture.live.x, originY: gesture.live.y, start: remaining };
  };

  const startTextResize = (event: React.PointerEvent<HTMLButtonElement>, layer: DailyLookTextLayer) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    textResizeRef.current = { textId: layer.id, startX: point.x, originFontSize: layer.fontSize };
    setSelectedTextId(layer.id);
    setSelectedLayerId(null);
  };

  const resizeTextLayer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = textResizeRef.current;
    if (!resize) return;
    event.stopPropagation();
    const point = pointerToCanvas(event);
    const nextFontSize = Math.max(TEXT_FONT_MIN, Math.min(TEXT_FONT_MAX, resize.originFontSize + (point.x - resize.startX) * 0.35));
    scheduleCanvasUpdate(() => updateTextLayer(resize.textId, { fontSize: Math.round(nextFontSize) }));
  };

  const endTextResize = () => {
    textResizeRef.current = null;
  };

  // 데스크톱 전용 텍스트 회전 핸들 — 예전에는 슬라이더로만 가능했던 텍스트 회전의 마우스 대체 경로다.
  const startTextRotate = (event: React.PointerEvent<HTMLElement>, layer: DailyLookTextLayer) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToCanvas(event);
    const startAngle = Math.atan2(point.y - layer.y, point.x - layer.x);
    textRotateRef.current = { textId: layer.id, centerX: layer.x, centerY: layer.y, startAngle, originRotation: layer.rotation };
    setSelectedTextId(layer.id);
    setSelectedLayerId(null);
  };

  const rotateTextLayer = (event: React.PointerEvent<HTMLElement>) => {
    const rotate = textRotateRef.current;
    if (!rotate) return;
    event.stopPropagation();
    const point = pointerToCanvas(event);
    const angle = Math.atan2(point.y - rotate.centerY, point.x - rotate.centerX);
    const deltaDeg = ((angle - rotate.startAngle) * 180) / Math.PI;
    const nextRotation = Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, Math.round(rotate.originRotation + deltaDeg)));
    scheduleCanvasUpdate(() => updateTextLayer(rotate.textId, { rotation: nextRotation }));
  };

  const endTextRotate = () => {
    textRotateRef.current = null;
  };

  const removeTextLayer = (textId: string) => {
    setState((prev) => ({
      ...prev,
      isConfirmed: false,
      confirmedImage: undefined,
      confirmedAt: undefined,
      textLayers: (prev.textLayers ?? []).filter((layer) => layer.id !== textId),
    }));
    setSelectedTextId(null);
  };

  // 선택된 레이어 위(공간이 부족하면 아래)에 붙는 미니 툴바 위치를 캔버스 비율 기준으로 계산한다.
  const layerToolbarStyle = (layer: DailyLookLayer): React.CSSProperties => {
    const widthPx = state.canvas.width * 0.34 * layer.scale;
    const halfHeightPct = ((widthPx * 1.18) / 2 / state.canvas.height) * 100;
    const xPct = (layer.x / state.canvas.width) * 100;
    const yPct = (layer.y / state.canvas.height) * 100;
    const above = yPct - halfHeightPct > 12;
    return above
      ? { left: `${xPct}%`, top: `${yPct - halfHeightPct}%`, transform: 'translate(-50%, calc(-100% - 10px))' }
      : { left: `${xPct}%`, top: `${yPct + halfHeightPct}%`, transform: 'translate(-50%, 10px)' };
  };

  const textToolbarStyle = (layer: DailyLookTextLayer): React.CSSProperties => {
    const xPct = (layer.x / state.canvas.width) * 100;
    const yPct = (layer.y / state.canvas.height) * 100;
    const halfHeightPx = (layer.fontSize * 0.5 * 1.15) / 2;
    return { left: `${xPct}%`, top: `${yPct}%`, transform: `translate(-50%, calc(-100% - ${halfHeightPx + 12}px))` };
  };

  const textPopoverStyle = (layer: DailyLookTextLayer): React.CSSProperties => {
    const xPct = (layer.x / state.canvas.width) * 100;
    const yPct = (layer.y / state.canvas.height) * 100;
    const halfHeightPx = (layer.fontSize * 0.5 * 1.15) / 2;
    return { left: `${xPct}%`, top: `${yPct}%`, transform: `translate(-50%, calc(-100% - ${halfHeightPx + 46}px))` };
  };

  const renderConfirmedImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width;
    canvas.height = state.canvas.height;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.fillStyle = state.background ?? '#f8f9fb';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const orderedLayers = [...state.layers].filter((layer) => layer.visible).sort((left, right) => left.zIndex - right.zIndex);
    for (const layer of orderedLayers) {
      const item = itemById.get(layer.itemId);
      if (!item) continue;
      const image = await loadCanvasImage(clothingDisplayImage(item));
      const width = 420 * layer.scale;
      const height = width * (image.naturalHeight / Math.max(image.naturalWidth, 1));
      context.save();
      context.translate(layer.x, layer.y);
      context.rotate((layer.rotation * Math.PI) / 180);
      context.drawImage(image, -width / 2, -height / 2, width, height);
      context.restore();
    }

    const orderedTextLayers = [...(state.textLayers ?? [])].filter((layer) => layer.visible).sort((left, right) => left.zIndex - right.zIndex);
    for (const layer of orderedTextLayers) {
      context.save();
      context.translate(layer.x, layer.y);
      context.rotate((layer.rotation * Math.PI) / 180);
      context.fillStyle = layer.color;
      context.font = `700 ${layer.fontSize}px Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(layer.text, 0, 0);
      context.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const confirmDailyLook = async () => {
    let confirmedImage: string | undefined;
    try {
      confirmedImage = await renderConfirmedImage();
    } catch {
      // 외부 이미지 CORS 정책으로 렌더링 저장이 막히면 배치 상태만 저장합니다.
      confirmedImage = undefined;
    }
    const nextState = { ...state, isConfirmed: true, confirmedImage, confirmedAt: new Date().toISOString() };
    setState(nextState);
    onSaveDailyLook(selectedOutfit.id, nextState, draftItemIds);
  };

  return (
    <section className="daily-page colorfit-daily">
      <div className="page-head">
        <div className="page-head-copy">
          <button className="button ghost wardrobe-back" type="button" onClick={onBack}><ArrowLeft className="icon" />보관함</button>
          <span className="page-kicker">Daily Look Studio</span>
          <h1>{selectedOutfit.title}</h1>
        </div>
        <div className="daily-head-actions">
          <button className="dailylook-bg-trigger" type="button" style={{ background: state.background }} aria-label="배경색" onClick={() => setBgPopoverOpen((prev) => !prev)} />
          <button className="button secondary" type="button" onClick={resetLayout}><RotateCcw className="icon" />자동 배치</button>
          <button className="button primary" type="button" disabled={!hasCanvasContent} onClick={confirmDailyLook}><Check className="icon" />이미지 완성</button>
        </div>
        {bgPopoverOpen && (
          <div className="dailylook-bg-popover">
            {DAILY_LOOK_BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={state.background === preset ? 'dailylook-bg-swatch active' : 'dailylook-bg-swatch'}
                style={{ background: preset }}
                aria-label={`배경색 ${preset}`}
                onClick={() => { updateBackground(preset); setBgPopoverOpen(false); }}
              />
            ))}
            <label className="dailylook-bg-custom" aria-label="커스텀 배경색">
              <input type="color" value={state.background ?? '#f8f9fb'} onChange={(event) => updateBackground(event.target.value)} />
            </label>
          </div>
        )}
      </div>
      {cutoutStatus === 'processing' && <p className="dailylook-cutout-status">누끼가 없는 옷을 데일리룩용 PNG로 처리하는 중입니다. 첫 실행은 모델 로딩 때문에 시간이 걸릴 수 있습니다.</p>}
      {cutoutStatus === 'error' && <p className="dailylook-cutout-status error">{cutoutError}</p>}
      <section className="daily-layout">
        <aside className={assetDrawerOpen ? 'panel asset-panel drawer-open' : 'panel asset-panel'}>
          <button className="daily-drawer-close" type="button" onClick={() => setAssetDrawerOpen(false)}>완료</button>
          <div className="section-head"><div><h3>사용 중인 옷</h3><small>{dailyLookItems.length}벌</small></div></div>
          <div className="asset-grid daily-asset-grid">
            {dailyLookItems.map((item) => (
              <div className={selectedLayerId === item.id ? 'asset-card active' : 'asset-card'} key={item.id}>
                <img src={clothingDisplayImage(item)} alt={item.type} />
                <button type="button" onClick={() => { setSelectedLayerId(item.id); setSelectedTextId(null); }} aria-label={item.type + ' 레이어 선택'}>{selectedLayerId === item.id ? <Check size={14} /> : '+'}</button>
                <small>{item.type}</small>
              </div>
            ))}
          </div>
          {dailyLookItems.length === 0 && <p className="daily-asset-empty">아직 배치한 옷이 없습니다.</p>}
          <button className="button primary full" type="button" onClick={() => setItemPickerOpen(true)}><Plus className="icon" />옷 추가</button>
          <button className="button secondary full" type="button" onClick={addTextLayer}><Plus className="icon" />텍스트 추가</button>
        </aside>
        <section className="canvas-panel panel">
          <div className="dailylook-stage-wrap">
            <div className="daily-canvas dailylook-stage" ref={canvasRef} style={{ backgroundColor: state.background }}>
              {!hasCanvasContent && <div className="daily-canvas-empty"><Plus className="icon" /><strong>옷이나 텍스트를 추가하세요.</strong><span>왼쪽의 추가 버튼으로 캔버스를 구성할 수 있습니다.</span></div>}
              {[...state.layers].filter((layer) => layer.visible).sort((left, right) => left.zIndex - right.zIndex).map((layer) => {
                const item = itemById.get(layer.itemId);
                if (!item) return null;
                return (
                  <button
                    key={layer.itemId}
                    className={selectedLayer?.itemId === layer.itemId ? 'canvas-item dailylook-layer selected' : 'canvas-item dailylook-layer'}
                    type="button"
                    style={{
                      left: `${(layer.x / state.canvas.width) * 100}%`,
                      top: `${(layer.y / state.canvas.height) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                      zIndex: layer.zIndex,
                    }}
                    onPointerDown={(event) => startLayerGesture(event, layer)}
                    onPointerMove={moveLayerGesture}
                    onPointerUp={endLayerGesturePointer}
                    onPointerCancel={endLayerGesturePointer}
                    onClick={() => {
                      setSelectedLayerId(layer.itemId);
                      setSelectedTextId(null);
                    }}
                  >
                    <img src={clothingDisplayImage(item)} alt={item.type} draggable={false} />
                    <span>{item.category}</span>
                    {selectedLayer?.itemId === layer.itemId && (
                      <>
                        <span
                          className="dailylook-layer-handle rotate"
                          role="button"
                          aria-label="옷 회전"
                          onPointerDown={(event) => startLayerRotate(event, layer)}
                          onPointerMove={rotateLayer}
                          onPointerUp={endLayerRotate}
                          onPointerCancel={endLayerRotate}
                        ><RotateCw size={12} /></span>
                        <span
                          className="dailylook-layer-handle resize"
                          role="button"
                          aria-label="옷 크기 조절"
                          onPointerDown={(event) => startLayerResize(event, layer)}
                          onPointerMove={resizeLayer}
                          onPointerUp={endLayerResize}
                          onPointerCancel={endLayerResize}
                        ><Maximize2 size={12} /></span>
                      </>
                    )}
                  </button>
                );
              })}
              {[...(state.textLayers ?? [])].filter((layer) => layer.visible).sort((left, right) => left.zIndex - right.zIndex).map((layer) => (
                <div
                  key={layer.id}
                  className={selectedTextLayer?.id === layer.id ? 'dailylook-text-layer selected' : 'dailylook-text-layer'}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: `${(layer.x / state.canvas.width) * 100}%`,
                    top: `${(layer.y / state.canvas.height) * 100}%`,
                    color: layer.color,
                    fontSize: `${layer.fontSize * 0.5}px`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                    zIndex: layer.zIndex,
                  }}
                  onPointerDown={(event) => startTextGesture(event, layer)}
                  onPointerMove={moveTextGesture}
                  onPointerUp={endTextGesturePointer}
                  onPointerCancel={endTextGesturePointer}
                  onClick={() => {
                    setSelectedTextId(layer.id);
                    setSelectedLayerId(null);
                  }}
                >
                  <span>{layer.text}</span>
                  {selectedTextLayer?.id === layer.id && (
                    <>
                      <button
                        className="dailylook-text-rotate"
                        type="button"
                        aria-label="텍스트 회전"
                        onPointerDown={(event) => startTextRotate(event, layer)}
                        onPointerMove={rotateTextLayer}
                        onPointerUp={endTextRotate}
                        onPointerCancel={endTextRotate}
                      ><RotateCw size={11} /></button>
                      <button
                        className="dailylook-text-resize"
                        type="button"
                        aria-label="텍스트 크기 조절"
                        onPointerDown={(event) => startTextResize(event, layer)}
                        onPointerMove={resizeTextLayer}
                        onPointerUp={endTextResize}
                        onPointerCancel={endTextResize}
                      ><Maximize2 size={11} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="dailylook-stage-overlay">
              {selectedLayer && (
                <div className="dailylook-mini-toolbar" style={layerToolbarStyle(selectedLayer)}>
                  <button type="button" aria-label="앞으로" onClick={() => moveLayerOrder('front')}><BringToFront size={14} /></button>
                  <button type="button" aria-label="뒤로" onClick={() => moveLayerOrder('back')}><SendToBack size={14} /></button>
                  <button type="button" aria-label={selectedLayer.visible ? '숨김' : '표시'} onClick={() => updateLayer(selectedLayer.itemId, { visible: !selectedLayer.visible })}>{selectedLayer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  <button type="button" aria-label="삭제" onClick={() => removeLayer(selectedLayer.itemId)}><Trash2 size={14} /></button>
                </div>
              )}
              {selectedTextLayer && (
                <>
                  <div className="dailylook-mini-toolbar" style={textToolbarStyle(selectedTextLayer)}>
                    <button type="button" aria-label="앞으로" onClick={() => moveTextLayerOrder('front')}><BringToFront size={14} /></button>
                    <button type="button" aria-label="뒤로" onClick={() => moveTextLayerOrder('back')}><SendToBack size={14} /></button>
                    <button type="button" aria-label={selectedTextLayer.visible ? '숨김' : '표시'} onClick={() => updateTextLayer(selectedTextLayer.id, { visible: !selectedTextLayer.visible })}>{selectedTextLayer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button type="button" aria-label="텍스트 수정" onClick={() => setTextPopover((prev) => (prev === 'edit' ? null : 'edit'))}><Type size={14} /></button>
                    <button type="button" aria-label="텍스트 색상" onClick={() => setTextPopover((prev) => (prev === 'color' ? null : 'color'))}><Palette size={14} /></button>
                    <button type="button" aria-label="삭제" onClick={() => removeTextLayer(selectedTextLayer.id)}><Trash2 size={14} /></button>
                  </div>
                  {textPopover && (
                    <div className="dailylook-text-popover" style={textPopoverStyle(selectedTextLayer)}>
                      {textPopover === 'edit' ? (
                        <input
                          type="text"
                          autoFocus
                          value={selectedTextLayer.text}
                          onChange={(event) => updateTextLayer(selectedTextLayer.id, { text: event.target.value || ' ' })}
                          onKeyDown={(event) => { if (event.key === 'Enter') setTextPopover(null); }}
                        />
                      ) : (
                        DAILY_LOOK_TEXT_COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="dailylook-text-popover-swatch"
                            style={{ background: color }}
                            aria-label={`텍스트 색상 ${color}`}
                            onClick={() => { updateTextLayer(selectedTextLayer.id, { color }); setTextPopover(null); }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </section>
      <button className="dailylook-asset-fab" type="button" onClick={() => setAssetDrawerOpen((prev) => !prev)} aria-label="사용 옷 관리">
        <Shirt className="icon" />
        {dailyLookItems.length > 0 && <span className="badge">{dailyLookItems.length}</span>}
      </button>
      {assetDrawerOpen && <div className="daily-drawer-backdrop" role="presentation" onClick={() => setAssetDrawerOpen(false)} />}
      {itemPickerOpen && (
        <div className="dailylook-picker-backdrop" role="presentation" onMouseDown={() => { setItemPickerOpen(false); setPickerSelectedIds(new Set()); }}>
          <section className="dailylook-picker-modal panel" role="dialog" aria-modal="true" aria-label="데일리룩 옷 추가" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dailylook-picker-head">
              <PanelTitle title="옷 추가" />
              <button className="line-button" type="button" onClick={() => { setItemPickerOpen(false); setPickerSelectedIds(new Set()); }}>닫기</button>
            </div>
            <div className="dailylook-picker-tabs">
              <button className={pickerSource === 'wardrobe' ? 'active' : ''} type="button" onClick={() => { setPickerSource('wardrobe'); setPickerSelectedIds(new Set()); }}>내 옷장</button>
              <button className={pickerSource === 'catalog' ? 'active' : ''} type="button" onClick={() => { setPickerSource('catalog'); setPickerSelectedIds(new Set()); }}>프로젝트 카탈로그</button>
            </div>

            {/* 카테고리 pill 필터 */}
            <div className="picker-filter-row">
              {(['전체', ...CATEGORY_OPTIONS] as Array<'전체' | ClothingCategory>).map((cat) => (
                <button key={cat} type="button" className={`picker-pill${pickerCategory === cat ? ' active' : ''}`} onClick={() => setPickerCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>

            {/* 시즌 pill 필터 — 카탈로그 전용 */}
            {pickerSource === 'catalog' && (
              <div className="picker-filter-row">
                {['전체', '봄', '여름', '가을', '겨울'].map((season) => (
                  <button key={season} type="button" className={`picker-pill${pickerSeason === season ? ' active' : ''}`} onClick={() => setPickerSeason(season)}>
                    {season}
                  </button>
                ))}
              </div>
            )}

            {/* 옷장 선택 — wardrobe 전용 */}
            {pickerSource === 'wardrobe' && (
              <div className="dailylook-picker-controls">
                <label>옷장
                  <select value={pickerWardrobeId} onChange={(event) => setPickerWardrobeId(event.target.value)}>
                    {wardrobes.map((wardrobe) => <option key={wardrobe.id} value={wardrobe.id}>{wardrobe.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            <p className="dailylook-picker-note">
              {pickerSource === 'wardrobe' ? pickerWardrobeName : '퍼컬 추천순'} · {pickerCategory} · {pickerItems.length}개
            </p>

            {/* 아이템 그리드 */}
            {pickerSource === 'catalog' ? (
              <div className="picker-catalog-grid">
                {pickerItems.map((item) => {
                  const isSelected = pickerSelectedIds.has(item.id);
                  const score = item.personalFitScore ?? 0;
                  return (
                    <button key={item.id} type="button" className={`picker-catalog-item${isSelected ? ' selected' : ''}`} onClick={() => togglePickerItem(item.id)}>
                      <div className="picker-catalog-img-wrap">
                        <img src={clothingDisplayImage(item)} alt={item.type} />
                        {isSelected && <span className="picker-check">✓</span>}
                        {score >= 80 && <span className="picker-fit-dot" title={`퍼컬 ${score}점`} />}
                      </div>
                      <small>{item.type}</small>
                    </button>
                  );
                })}
                {pickerItems.length === 0 && <p className="picker-empty">해당 조건의 아이템이 없습니다.</p>}
              </div>
            ) : (
              <div className="dailylook-picker-grid">
                {pickerItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => addDailyLookItem(item.id)}>
                    <img src={clothingDisplayImage(item)} alt={item.type} />
                    <span>
                      <strong>{item.type}</strong>
                      <small>{item.brand} · {item.category}</small>
                      <small>{item.representativeHex ?? item.color}</small>
                    </span>
                  </button>
                ))}
                {pickerItems.length === 0 && <EmptyState title="추가할 옷이 없습니다." description="다른 옷장이나 카테고리를 선택해 주세요." />}
              </div>
            )}

            {/* 하단 sticky 바 — 카탈로그 전용 */}
            {pickerSource === 'catalog' && (
              <div className="picker-action-bar">
                <span className="picker-action-count">{pickerSelectedIds.size > 0 ? `${pickerSelectedIds.size}개 선택됨` : '아이템을 선택하세요'}</span>
                <button className="picker-action-confirm" disabled={pickerSelectedIds.size === 0} onClick={batchAddDailyLookItems}>
                  추가하기
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

// 이미지 URL을 HTMLImageElement로 로드합니다. 가상착용 확정 이미지 렌더링에서 사용됩니다.
function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
