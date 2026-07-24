// 옷장 목록, 상세, 카탈로그, 직접 등록 화면을 전환하는 컴포넌트입니다.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Grid2X2, List, Plus, Search, Shirt, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { BackTitle } from '../../components/common';
import { ColorInsightModal } from '../color/ColorInsightModal';
import { clothingDisplayImage, isHexColor } from '../../services/clothingDisplay';
import { buildColorInsight } from '../../services/colorInsight';
import { buildColorMeta, colorMetaForInput } from '../../services/clothingMeta';
import { loadJson, saveJson } from '../../services/storage';
import type { CatalogItem } from '../../data/trainingCatalog';
import type { FinalResult } from '../../types';
import type { UrlImportState } from '../../hooks/useManualClothing';
import type { AvailabilityStatus, ClothingCategory, ClothingColorAnalysis, ScoredClothingItem, Wardrobe, WardrobeView } from '../../wardrobeTypes';
import { AVAILABILITY_OPTIONS, CATALOG_TABS, CATEGORY_OPTIONS, CATEGORY_UI_META, COLOR_META, MATERIAL_LABELS, PATTERN_LABELS, SEASON_TAGS, SIZES, TYPES } from '../../wardrobeConstants';

export function WardrobeSection(props: {
  view: WardrobeView;
  setView: (view: WardrobeView) => void;
  onBack: () => void;
  wardrobes: Wardrobe[];
  activeWardrobe?: Wardrobe;
  personalColorResult: FinalResult | null;
  allItems: ScoredClothingItem[];
  activeItems: ScoredClothingItem[];
  wardrobeSearch: string;
  setWardrobeSearch: (value: string) => void;
  detailSearch: string;
  setDetailSearch: (value: string) => void;
  detailCategory: '전체' | ClothingCategory;
  setDetailCategory: (value: '전체' | ClothingCategory) => void;
  detailLayout: 'grid' | 'list';
  setDetailLayout: (value: 'grid' | 'list') => void;
  catalogItems: CatalogItem[];
  catalogCategory: '전체' | ClothingCategory;
  setCatalogCategory: (value: '전체' | ClothingCategory) => void;
  selectedCatalogIds: string[];
  setSelectedCatalogIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCatalogItems: CatalogItem[];
  catalogSaveMode: 'create' | 'append';
  setCatalogSaveMode: (value: 'create' | 'append') => void;
  newWardrobeName: string;
  setNewWardrobeName: (value: string) => void;
  onSelectWardrobe: (id: string) => void;
  onRenameWardrobe: (id: string, name: string) => void;
  onDeleteWardrobe: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onOpenCatalog: (mode: 'create' | 'append') => void;
  onSaveCatalog: () => void;
  onRecommend: () => void;
  onFindOutfits: (item: ScoredClothingItem) => void;
  manual: {
    imageUrl: string;
    category: ClothingCategory;
    type: string;
    color: string;
    size: string;
    brand: string;
    seasonTag: string;
    availabilityStatus: AvailabilityStatus;
  };
  setManual: React.Dispatch<React.SetStateAction<any>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackground: () => void;
  onPrecisionExtract: () => void;
  backgroundRemoveStatus: 'idle' | 'processing' | 'done' | 'error';
  backgroundRemoveError: string;
  urlImport: UrlImportState;
  setUrlImport: React.Dispatch<React.SetStateAction<UrlImportState>>;
  onAnalyzeUrl: () => void;
  onSelectUrlImage: (imageUrl: string) => void;
  onAdoptUrlImage: () => Promise<boolean>;
  onCategory: (category: ClothingCategory) => void;
  onSaveManual: () => void;
}) {
  if (props.view === 'detail' && props.activeWardrobe) {
    return <WardrobeDetailView {...props} activeWardrobe={props.activeWardrobe} />;
  }
  if (props.view === 'catalog') return <CatalogSelectionView {...props} />;
  if (props.view === 'preview') return <CatalogPreviewView {...props} />;
  if (props.view === 'manual') return <ManualAdd {...props} />;
  return <WardrobeOverview {...props} />;
}

// 사용자의 옷장 목록과 생성 UI를 보여주는 화면입니다.
function WardrobeOverview(props: {
  wardrobes: Wardrobe[];
  allItems: ScoredClothingItem[];
  wardrobeSearch: string;
  setWardrobeSearch: (value: string) => void;
  onSelectWardrobe: (id: string) => void;
  onRenameWardrobe: (id: string, name: string) => void;
  onDeleteWardrobe: (id: string) => void;
  onOpenCatalog: (mode: 'create' | 'append') => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const filtered = props.wardrobes.filter((wardrobe) => wardrobe.name.toLowerCase().includes(props.wardrobeSearch.toLowerCase()));
  const categoryCount = new Set(props.allItems.map((item) => item.category)).size;
  const recentCount = props.allItems.filter((item) => Date.now() - new Date(item.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;

  const startEditing = () => {
    setDraftNames(Object.fromEntries(props.wardrobes.map((wardrobe) => [wardrobe.id, wardrobe.name])));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftNames({});
    setIsEditing(false);
  };

  const saveEditing = () => {
    props.wardrobes.forEach((wardrobe) => {
      const nextName = draftNames[wardrobe.id];
      if (nextName !== undefined && nextName.trim() !== wardrobe.name) props.onRenameWardrobe(wardrobe.id, nextName);
    });
    setIsEditing(false);
  };

  return (
    <section className="wardrobe-page colorfit-wardrobe">
      <div className="page-head">
        <div className="page-head-copy"><span className="page-kicker">My Wardrobes</span><h1>내 옷장</h1><p>목적별로 옷을 나누고 필요한 옷장만 추천에 사용할 수 있습니다.</p></div>
        <button className="button primary" type="button" onClick={() => props.onOpenCatalog('create')}><Plus className="icon" />새 옷장</button>
      </div>
      <div className="summary-strip">
        <span className="summary-cell metric"><small>옷장</small><strong>{props.wardrobes.length}</strong></span>
        <span className="summary-cell metric"><small>등록한 옷</small><strong>{props.allItems.length}</strong></span>
        <span className="summary-cell metric"><small>카테고리</small><strong>{categoryCount}</strong></span>
        <span className="summary-cell metric"><small>최근 7일 추가</small><strong>{recentCount}</strong></span>
      </div>
      <div className="toolbar">
        <label className="search"><Search className="icon" /><input value={props.wardrobeSearch} onChange={(event) => props.setWardrobeSearch(event.target.value)} placeholder="옷장 이름 검색" /></label>
        {isEditing ? (
          <>
            <button className="button ghost" type="button" onClick={cancelEditing}>취소</button>
            <button className="button primary" type="button" onClick={saveEditing}><Check className="icon" />저장</button>
          </>
        ) : <button className="button secondary" type="button" onClick={startEditing}>편집</button>}
        <button className="button secondary" type="button" onClick={() => props.onOpenCatalog('create')}>카탈로그에서 추가</button>
      </div>
      <div className="wardrobe-grid">
        {filtered.map((wardrobe) => (
          <WardrobeCard
            key={wardrobe.id}
            wardrobe={wardrobe}
            items={props.allItems.filter((item) => item.wardrobeId === wardrobe.id)}
            editing={isEditing}
            draftName={draftNames[wardrobe.id] ?? wardrobe.name}
            onDraftName={(value) => setDraftNames((prev) => ({ ...prev, [wardrobe.id]: value }))}
            onOpen={() => props.onSelectWardrobe(wardrobe.id)}
            onDelete={() => props.onDeleteWardrobe(wardrobe.id)}
          />
        ))}
        <button className="wardrobe-card panel wardrobe-create-card" type="button" onClick={() => props.onOpenCatalog('create')}>
          <span className="wardrobe-create-icon"><Plus className="icon" /></span>
          <span><strong>새 옷장 만들기</strong><small>여행, 계절, 상황별로 분류합니다.</small></span>
        </button>
      </div>
    </section>
  );
}

// 옷장 하나를 카드로 표시합니다. 이름 수정/삭제/상세 진입 액션을 포함합니다.
function WardrobeCard({
  wardrobe,
  items,
  editing,
  draftName,
  onDraftName,
  onOpen,
  onDelete,
}: {
  key?: React.Key;
  wardrobe: Wardrobe;
  items: ScoredClothingItem[];
  editing: boolean;
  draftName: string;
  onDraftName: (value: string) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const counts = {
    상의: items.filter((item) => item.category === '상의').length,
    하의: items.filter((item) => item.category === '하의').length,
    아우터: items.filter((item) => item.category === '아우터').length,
  };
  return (
    <article className="wardrobe-card panel">
      <button className="mosaic" type="button" onClick={onOpen}>
        {Array.from({ length: 4 }).map((_, index) => items[index]
          ? <img key={items[index].id} src={clothingDisplayImage(items[index])} alt={items[index].type} />
          : <span key={index} />)}
      </button>
      <div className="wardrobe-card-body">
        {editing ? (
          <label className="wardrobe-name-edit"><span>옷장 이름</span><input value={draftName} onChange={(event) => onDraftName(event.target.value)} /></label>
        ) : (
          <button className="wardrobe-card-title" type="button" onClick={onOpen}>
            <span><strong>{wardrobe.name}</strong><small>{items.length}벌</small></span><ChevronRight className="icon" />
          </button>
        )}
        <div className="meta"><span>상의 {counts.상의} · 하의 {counts.하의}</span><span>아우터 {counts.아우터}</span></div>
        {editing && <button className="button danger" type="button" onClick={onDelete}>옷장 삭제</button>}
      </div>
    </article>
  );
}

// 선택한 옷장 안의 의류 목록과 필터/검색/추가 진입 버튼을 보여줍니다.
function WardrobeDetailView(props: {
  onFindOutfits: (item: ScoredClothingItem) => void;
  activeWardrobe: Wardrobe;
  personalColorResult: FinalResult | null;
  activeItems: ScoredClothingItem[];
  detailSearch: string;
  setDetailSearch: (value: string) => void;
  detailCategory: '전체' | ClothingCategory;
  setDetailCategory: (value: '전체' | ClothingCategory) => void;
  detailLayout: 'grid' | 'list';
  setDetailLayout: (value: 'grid' | 'list') => void;
  setView: (view: WardrobeView) => void;
  onBack: () => void;
  onDeleteItem: (id: string) => void;
  onOpenCatalog: (mode: 'create' | 'append') => void;
  onRecommend: () => void;
  onRenameWardrobe: (id: string, name: string) => void;
}) {
  const filtered = props.activeItems.filter((item) =>
    (props.detailCategory === '전체' || item.category === props.detailCategory)
    && (item.type + ' ' + item.color + ' ' + item.brand).toLowerCase().includes(props.detailSearch.toLowerCase()),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(props.activeWardrobe.name);
  const [selectedColorInsightItem, setSelectedColorInsightItem] = useState<ScoredClothingItem | null>(null);
  const [selectedColorHex, setSelectedColorHex] = useState('');
  const selectedColorInsight = selectedColorInsightItem && props.personalColorResult
    ? buildColorInsight({
      hex: selectedColorHex || selectedColorInsightItem.representativeHex,
      seasonId: props.personalColorResult.seasonTop1Id,
      sourceLabel: '옷장 · ' + props.activeWardrobe.name,
    })
    : null;
  const commonColors = Array.from(props.activeItems.reduce((map, item) => {
    const hex = item.representativeHex.toUpperCase();
    map.set(hex, (map.get(hex) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).sort((left, right) => right[1] - left[1]).slice(0, 4);
  const categoryMax = Math.max(1, ...CATEGORY_OPTIONS.map((category) => props.activeItems.filter((item) => item.category === category).length));

  const saveName = () => {
    props.onRenameWardrobe(props.activeWardrobe.id, draftName);
    setIsEditing(false);
  };
  const openColorInsight = (item: ScoredClothingItem) => {
    setSelectedColorInsightItem(item);
    setSelectedColorHex(item.representativeHex);
  };

  return (
    <section className="wardrobe-page colorfit-wardrobe-detail">
      <div className="page-head">
        <div className="page-head-copy">
          <button className="button ghost wardrobe-back" type="button" onClick={props.onBack}><ArrowLeft className="icon" />옷장 목록</button>
          <h1>{props.activeWardrobe.name}</h1>
          <p>{props.activeItems.length}벌 · 자주 입는 색과 카테고리를 함께 확인합니다.</p>
        </div>
        <div className="wardrobe-detail-actions">
          <button className="button secondary" type="button" onClick={() => props.setView('manual')}><Plus className="icon" />옷 추가</button>
          <button className="button primary" type="button" onClick={props.onRecommend}><Sparkles className="icon" />추천 받기</button>
        </div>
      </div>

      {isEditing && (
        <section className="panel wardrobe-detail-edit">
          <label>옷장 이름<input value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label>
          <div><button className="button ghost" type="button" onClick={() => { setDraftName(props.activeWardrobe.name); setIsEditing(false); }}>취소</button><button className="button primary" type="button" onClick={saveName}>저장</button></div>
        </section>
      )}

      <div className="detail-layout">
        <div className="wardrobe-detail-main">
          <div className="toolbar">
            <label className="search"><Search className="icon" /><input value={props.detailSearch} onChange={(event) => props.setDetailSearch(event.target.value)} placeholder="옷 이름, 브랜드, 색상 검색" /></label>
            <div className="chip-row">{CATALOG_TABS.slice(0, 5).map((tab) => <button key={tab} className={props.detailCategory === tab ? 'chip active' : 'chip'} type="button" onClick={() => props.setDetailCategory(tab)}>{tab}</button>)}</div>
            <button className="button icon-only secondary" type="button" onClick={() => props.setDetailLayout('grid')} aria-label="격자 보기"><Grid2X2 className="icon" /></button>
            <button className="button icon-only secondary" type="button" onClick={() => props.setDetailLayout('list')} aria-label="목록 보기"><List className="icon" /></button>
          </div>
          <div className={props.detailLayout === 'list' ? 'clothing-grid list-view' : 'clothing-grid'}>
            {filtered.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                onDelete={() => props.onDeleteItem(item.id)}
                onFindOutfits={props.onFindOutfits}
                colorInsightEnabled={Boolean(props.personalColorResult)}
                onOpenColorInsight={() => openColorInsight(item)}
              />
            ))}
          </div>
        </div>

        <aside className="insight-panel">
          <section className="panel wardrobe-color-summary">
            <div className="section-head"><div><h2>자주 입는 색</h2><small>등록된 대표색 기준</small></div></div>
            <div className="color-summary-dots" aria-label="자주 입는 색상">
              {commonColors.length > 0 ? commonColors.map(([hex]) => <i key={hex} style={{ backgroundColor: hex }} title={hex} />) : <span>아직 색상 정보가 없습니다.</span>}
            </div>
            <p>{commonColors.length > 0 ? commonColors.map(([hex]) => hex).join(', ') + ' 색이 옷장의 중심입니다.' : '옷을 추가하면 대표색 구성이 여기에 표시됩니다.'}</p>
          </section>
          <section className="panel">
            <div className="section-head"><div><h2>카테고리 구성</h2><small>실제 등록 수</small></div></div>
            <div className="axis-list">
              {CATEGORY_OPTIONS.slice(0, 4).map((category) => {
                const count = props.activeItems.filter((item) => item.category === category).length;
                return <div className="axis-row" key={category}><span>{category}</span><span className="axis-track"><i style={{ width: (count / categoryMax) * 100 + '%' }} /></span><strong>{count}</strong></div>;
              })}
            </div>
          </section>
          <section className="panel wardrobe-manage-panel">
            <button className="button secondary" type="button" onClick={() => setIsEditing(true)}>옷장 이름 편집</button>
            <button className="button secondary" type="button" onClick={() => props.onOpenCatalog('append')}>카탈로그에서 추가</button>
          </section>
        </aside>
      </div>

      {selectedColorInsightItem && selectedColorInsight && (
        <ColorInsightModal
          insight={selectedColorInsight}
          itemName={selectedColorInsightItem.brand + ' ' + selectedColorInsightItem.type}
          dominantHexes={dominantHexesForItem(selectedColorInsightItem)}
          activeHex={selectedColorHex}
          onSelectHex={setSelectedColorHex}
          onClose={() => setSelectedColorInsightItem(null)}
        />
      )}
    </section>
  );
}

// 의류 하나를 카드로 표시합니다. 퍼스널컬러 적합도와 상태 정보를 함께 보여줍니다.
const ANCHORABLE_CATEGORIES: ClothingCategory[] = ['상의', '하의', '아우터'];

function ClothingCard({ item, onDelete, onFindOutfits, colorInsightEnabled, onOpenColorInsight }: { key?: React.Key; item: ScoredClothingItem; onDelete: () => void; onFindOutfits: (item: ScoredClothingItem) => void; colorInsightEnabled: boolean; onOpenColorInsight: () => void }) {
  return (
    <article className="clothing-card card">
      <div className="clothing-img">
        <img src={clothingDisplayImage(item)} alt={item.type} />
        <span className="fit-pill">{item.fitGrade ?? item.category}</span>
      </div>
      <div className="clothing-info">
        <span className="category-label">{item.brand}</span>
        <h3>{item.type}</h3>
        <p>{item.category} · {item.seasonTag} · {item.availabilityStatus}</p>
        <button
          className="color-trigger"
          type="button"
          disabled={!colorInsightEnabled}
          title={colorInsightEnabled ? undefined : '퍼스널컬러 측정 후 색상 분석을 볼 수 있어요'}
          onClick={onOpenColorInsight}
          aria-label={item.type + ' 색상 정보 보기'}
        >
          <i className="color-dot" style={{ backgroundColor: item.representativeHex }} />
          <span>{item.representativeHex} · {colorInsightEnabled ? '색상 분석' : '퍼컬 측정 후 이용'}</span>
        </button>
        <div className="clothing-card-actions">
          {ANCHORABLE_CATEGORIES.includes(item.category) && <button className="button ghost" type="button" onClick={() => onFindOutfits(item)}><Sparkles className="icon" />이 옷으로 코디</button>}
          <button className="button ghost danger" type="button" onClick={onDelete}><Trash2 className="icon" />삭제</button>
        </div>
      </div>
    </article>
  );
}

function dominantHexesForItem(item: ScoredClothingItem): string[] {
  const hexes = [item.representativeHex, ...item.dominantColors.map((color) => color.hex).filter(Boolean) as string[]];
  return Array.from(new Set(hexes));
}

// 카탈로그에서 추가할 의류를 고르는 화면입니다.
function CatalogSelectionView(props: {
  setView: (view: WardrobeView) => void;
  onBack: () => void;
  catalogItems: CatalogItem[];
  catalogCategory: '전체' | ClothingCategory;
  setCatalogCategory: (value: '전체' | ClothingCategory) => void;
  selectedCatalogIds: string[];
  setSelectedCatalogIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [subcat, setSubcat] = useState('전체');
  const [season, setSeason] = useState('전체');
  const prevCategory = React.useRef(props.catalogCategory);
  if (prevCategory.current !== props.catalogCategory) {
    prevCategory.current = props.catalogCategory;
    setSubcat('전체');
  }

  const subcategories = props.catalogCategory === '전체' ? [] :
    ['전체', ...Array.from(new Set(props.catalogItems.map((i) => i.subcategory))).sort()];

  const displayItems = props.catalogItems
    .filter((i) => subcat === '전체' || i.subcategory === subcat)
    .filter((i) => season === '전체' || i.seasonTag.includes(season));

  const selected = new Set(props.selectedCatalogIds);

  const toggle = (id: string) =>
    props.setSelectedCatalogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <section className="wardrobe-page catalog-selection-page">
      <BackTitle title="나만의 옷장 만들기" description="카탈로그에서 필요한 옷을 선택해 내 옷장을 구성합니다." onBack={props.onBack} />
      <div className="catalog-head"><h2><Shirt size={19} /> 내 옷 고르기</h2><p>이미 준비된 옷들 중에서 체크해서 나만의 옷장을 구성해 보세요.</p></div>
      <section className="catalog-browser-panel">
        {/* 대분류 탭 */}
        <div className="catalog-tabs band catalog-tabs-sticky">
          {CATALOG_TABS.map((tab) => <button key={tab} className={props.catalogCategory === tab ? 'active' : ''} onClick={() => props.setCatalogCategory(tab)}>{tab}</button>)}
        </div>
        {/* 소분류 pills */}
        {subcategories.length > 1 && (
          <div className="catalog-subtabs">
            {subcategories.map((sc) => <button key={sc} type="button" className={subcat === sc ? 'active' : ''} onClick={() => setSubcat(sc)}>{sc}</button>)}
          </div>
        )}
        {/* 시즌 pill 필터 */}
        <div className="catalog-subtabs">
          {['전체', '봄', '여름', '가을', '겨울'].map((s) => (
            <button key={s} type="button" className={season === s ? 'active' : ''} onClick={() => setSeason(s)}>{s}</button>
          ))}
        </div>
        {/* 아이템 그리드 */}
        <div className="catalog-scroll-box catalog-scroll-box--with-bar">
          <div className="catalog-card-grid">
            {displayItems.map((item) => (
              <button key={item.catalogItemId} className={selected.has(item.catalogItemId) ? 'catalog-pick-card selected' : 'catalog-pick-card'} type="button" onClick={() => toggle(item.catalogItemId)}>
                <img src={item.imageUrl} alt={item.name} />
                {selected.has(item.catalogItemId) && <span className="selected-check"><Check size={15} /></span>}
                <span className="catalog-card-label">
                  <strong>{item.subcategory}</strong>
                  <small>{item.seasonTag}</small>
                </span>
              </button>
            ))}
            {displayItems.length === 0 && <p className="picker-empty">해당 조건의 아이템이 없습니다.</p>}
          </div>
        </div>
      </section>
      {/* sticky 하단 선택 바 */}
      <div className="catalog-action-bar">
        <span className="picker-action-count">{selected.size > 0 ? `${selected.size}개 선택됨` : '옷을 선택하세요'}</span>
        <button className="picker-action-confirm" disabled={selected.size === 0} onClick={() => props.setView('preview')}>
          선택 완료
        </button>
      </div>
    </section>
  );
}

// 카탈로그 상품을 옷장에 넣기 전에 이미지/색상/카테고리를 미리 확인하는 화면입니다.
function CatalogPreviewView(props: {
  setView: (view: WardrobeView) => void;
  onBack: () => void;
  selectedCatalogItems: CatalogItem[];
  catalogSaveMode: 'create' | 'append';
  setCatalogSaveMode: (value: 'create' | 'append') => void;
  wardrobes: Wardrobe[];
  activeWardrobe?: Wardrobe;
  newWardrobeName: string;
  setNewWardrobeName: (value: string) => void;
  onSaveCatalog: () => void;
}) {
  const selectedByCategory = (category: ClothingCategory) => props.selectedCatalogItems.filter((item) => item.category === category);
  return (
    <section className="wardrobe-page">
      <BackTitle title="나만의 옷장 만들기" description="카탈로그에서 필요한 옷을 선택해 내 옷장을 구성합니다." onBack={props.onBack} />
      <div className="preview-subtitle"><button type="button" onClick={props.onBack}><ArrowLeft size={19} /></button><div><h2>선택한 옷 미리보기</h2><p>새 옷장을 만들거나, 기존 옷장에 담아 바로 사용할 수 있어요.</p></div></div>
      <section className="preview-stage">
        {(['아우터', '상의', '하의'] as ClothingCategory[]).map((category) => (
          <div className="preview-row" key={category}>
            <strong>{category}</strong>
            <div className="preview-slots">
              {selectedByCategory(category).length === 0 ? <span className="empty-slot">비어있음</span> : selectedByCategory(category).map((item) => <span className="preview-thumb" key={item.catalogItemId}><img src={item.imageUrl} alt={item.name} /><small>{item.name}</small></span>)}
            </div>
          </div>
        ))}
      </section>
      <div className="preview-bottom">
        <section className="panel save-method">
          <h2><Shirt size={18} /> 저장 방식</h2>
          <p>새 옷장을 만들지, 기존 옷장에 담을지 선택해 주세요.</p>
          <div className="save-mode-row">
            <button className={props.catalogSaveMode === 'create' ? 'selected' : ''} type="button" onClick={() => props.setCatalogSaveMode('create')}><strong>새 옷장 만들기</strong><small>선택한 옷들로 새로운 옷장을 만듭니다.</small></button>
            <button className={props.catalogSaveMode === 'append' ? 'selected' : ''} type="button" onClick={() => props.setCatalogSaveMode('append')}><strong>기존 옷장에 담기</strong><small>현재 옷장에 이어서 아이템을 채워 넣습니다.</small></button>
          </div>
          {props.catalogSaveMode === 'create' ? <label>새 옷장 이름<input value={props.newWardrobeName} onChange={(event) => props.setNewWardrobeName(event.target.value)} /></label> : <label>담을 옷장<select value={props.activeWardrobe?.id ?? ''} disabled>{props.wardrobes.map((wardrobe) => <option key={wardrobe.id} value={wardrobe.id}>{wardrobe.name}</option>)}</select></label>}
        </section>
        <section className="panel selection-summary">
          <h2>선택 요약</h2>
          <div className="summary-grid"><span><small>총 선택</small><strong>{props.selectedCatalogItems.length}개</strong></span><span><small>상의/하의</small><strong>{selectedByCategory('상의').length}/{selectedByCategory('하의').length}</strong></span><span><small>아우터</small><strong>{selectedByCategory('아우터').length}개</strong></span><span><small>저장 대상</small><strong>{props.catalogSaveMode === 'create' ? '새 옷장' : '기존 옷장'}</strong></span></div>
          <button className="black-button full" type="button" onClick={props.onSaveCatalog}>선택한 옷 {props.catalogSaveMode === 'create' ? '새 옷장에 담기' : '기존 옷장에 담기'} <ChevronRight size={16} /></button>
        </section>
      </div>
    </section>
  );
}

// '옷 골라 담기'(카탈로그) 유도 팝업을 처음 한 번만 보여주기 위한 localStorage 플래그 키.
const CATALOG_TIP_SEEN_KEY = 'colorfit.catalogTabTipSeen';

// 사용자가 직접 의류를 등록하는 화면입니다. 이미지, 카테고리, 타입, 색상, 사이즈, 브랜드를 입력받습니다.
function ManualAdd(props: {
  setView: (view: WardrobeView) => void;
  onBack: () => void;
  onOpenCatalog: (mode: 'create' | 'append') => void;
  personalColorResult: FinalResult | null;
  manual: any;
  setManual: React.Dispatch<React.SetStateAction<any>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackground: () => void;
  onPrecisionExtract: () => void;
  backgroundRemoveStatus: 'idle' | 'processing' | 'done' | 'error';
  backgroundRemoveError: string;
  urlImport: UrlImportState;
  setUrlImport: React.Dispatch<React.SetStateAction<UrlImportState>>;
  onAnalyzeUrl: () => void;
  onSelectUrlImage: (imageUrl: string) => void;
  onAdoptUrlImage: () => Promise<boolean>;
  onCategory: (category: ClothingCategory) => void;
  onSaveManual: () => void;
}) {
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  // 첫 사용자에게만 '옷 골라 담기'를 써보라고 안내하는 코치 팝업. 한 번 닫으면 다시 뜨지 않는다.
  const [showCatalogTip, setShowCatalogTip] = useState(() => !loadJson<boolean>(CATALOG_TIP_SEEN_KEY, false));
  const dismissCatalogTip = () => {
    setShowCatalogTip(false);
    saveJson(CATALOG_TIP_SEEN_KEY, true);
  };
  const openCatalogFromTip = () => {
    dismissCatalogTip();
    props.onOpenCatalog('append');
  };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [selectedInsightHex, setSelectedInsightHex] = useState('');
  const sheetDrag = useRef<{ startY: number; pointerId: number } | null>(null);
  const sizes = props.manual.category === '하의' ? SIZES.bottoms : props.manual.category === '신발' ? SIZES.shoes : SIZES.tops;
  const detectedColors = props.manual.segmentation?.colors ?? [];
  const selectedColorMeta = colorMetaForInput(props.manual.color);
  const structuredMeta = buildColorMeta(props.manual.category, props.manual.type, props.manual.color, detectedColors, props.manual.brand);
  const urlResult = props.urlImport.result;
  const selectedUrlImage = props.urlImport.selectedImageUrl ?? urlResult?.representativeImageUrl ?? null;
  const selectedInsight = selectedInsightHex && props.personalColorResult
    ? buildColorInsight({ hex: selectedInsightHex, seasonId: props.personalColorResult.seasonTop1Id, sourceLabel: '옷 추가 · 이미지 분석' })
    : null;

  useEffect(() => {
    if (!detailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailsOpen]);

  const handleAdoptUrlImage = async () => {
    const success = await props.onAdoptUrlImage();
    if (success) setInputMode('upload');
  };

  const startSheetDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetDrag.current = { startY: event.clientY, pointerId: event.pointerId };
  };

  const moveSheet = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!sheetDrag.current || sheetDrag.current.pointerId !== event.pointerId) return;
    setSheetOffset(Math.max(0, event.clientY - sheetDrag.current.startY));
  };

  const endSheetDrag = () => {
    if (sheetOffset > 80) setDetailsOpen(false);
    setSheetOffset(0);
    sheetDrag.current = null;
  };

  const openDetectedColor = (hex: string) => {
    props.setManual((prev: any) => ({ ...prev, color: hex }));
    if (props.personalColorResult) setSelectedInsightHex(hex);
  };

  return (
    <section className="wardrobe-page colorfit-manual-add">
      <div className="page-head">
        <div className="page-head-copy"><span className="page-kicker">Analysis First</span><h1>새 옷 추가</h1><p>이미지를 먼저 분석하고 결과가 다를 때만 상세 정보를 수정합니다.</p></div>
        <button className="button secondary" type="button" onClick={props.onBack}>취소</button>
      </div>

      <div className="add-layout">
        <section className="panel upload-panel">
          <div className="source-tabs" role="tablist" aria-label="의류 입력 방식">
            <button className={inputMode === 'upload' ? 'source-tab active' : 'source-tab'} type="button" aria-selected={inputMode === 'upload'} onClick={() => setInputMode('upload')}>사진 업로드</button>
            <button className={inputMode === 'url' ? 'source-tab active' : 'source-tab'} type="button" aria-selected={inputMode === 'url'} onClick={() => setInputMode('url')}>URL 가져오기</button>
            <button className={'source-tab source-tab--catalog' + (showCatalogTip ? ' is-nudged' : '')} type="button" aria-selected={false} onClick={() => props.onOpenCatalog('append')}>옷 골라 담기</button>
          </div>

          {showCatalogTip && (
            <div className="catalog-tab-coach" role="dialog" aria-label="옷 골라 담기 안내">
              <button className="catalog-tab-coach-close" type="button" onClick={dismissCatalogTip} aria-label="안내 닫기"><X className="icon" /></button>
              <div className="catalog-tab-coach-body">
                <strong>사진 찍기 번거롭다면?</strong>
                <p>준비된 옷 중에서 마음에 드는 걸 바로 골라 담을 수 있어요.</p>
              </div>
              <button className="catalog-tab-coach-cta" type="button" onClick={openCatalogFromTip}>옷 골라 담기</button>
            </div>
          )}

          {inputMode === 'upload' ? (
            <>
              <div className="upload-preview">
                {props.manual.imageUrl ? <img src={props.manual.imageUrl} alt="추가할 옷 미리보기" /> : <span className="upload-empty"><Upload className="icon" /><strong>옷 사진을 추가해 주세요.</strong><small>배경이 단순하고 옷 전체가 보이는 사진이 좋습니다.</small></span>}
                {props.backgroundRemoveStatus === 'processing' && <span className="analysis-badge"><Sparkles className="icon" />사진 분석 중</span>}
                {props.manual.aiAnalyzed && props.backgroundRemoveStatus !== 'processing' && <span className="analysis-badge"><Check className="icon" />사진 분석 완료</span>}
              </div>
              <div className="upload-primary-actions">
                <button className="button primary" type="button" onClick={() => props.fileInputRef.current?.click()}>앨범에서 선택</button>
                <button className="button secondary" type="button" onClick={() => props.cameraInputRef.current?.click()}>사진 촬영</button>
              </div>
              {props.manual.imageFile && (
                <div className="cutout-actions">
                  <span>배경 처리는 선택 사항입니다.</span>
                  <button className="button ghost" onClick={props.onRemoveBackground} disabled={props.backgroundRemoveStatus === 'processing'} type="button">배경 제거</button>
                  <button className="button ghost" onClick={props.onPrecisionExtract} disabled={props.backgroundRemoveStatus === 'processing'} type="button">정밀 추출</button>
                </div>
              )}
              {props.backgroundRemoveStatus === 'error' && <p className="manual-helper error">{props.backgroundRemoveError}</p>}
            </>
          ) : (
            <div className="url-ingest-panel">
              <label className="url-ingest-field">
                <span>쇼핑몰 상품 주소나 이미지 주소</span>
                <input
                  value={props.urlImport.url}
                  onChange={(event) => props.setUrlImport((prev) => ({ ...prev, url: event.target.value, status: prev.status === 'error' ? 'idle' : prev.status, error: '' }))}
                  placeholder="https://shop.example.com/products/item"
                />
              </label>
              <button className="button primary" type="button" disabled={!props.urlImport.url.trim() || props.urlImport.status === 'processing'} onClick={props.onAnalyzeUrl}>
                {props.urlImport.status === 'processing' ? '주소 확인 중' : '주소 분석'}
              </button>
              {props.urlImport.status === 'idle' && <p className="manual-helper">상품 페이지에서는 대표 이미지를 찾고, 이미지 주소는 바로 가져옵니다.</p>}
              {props.urlImport.status === 'processing' && <p className="manual-helper">주소와 이미지 형식을 확인하고 있습니다.</p>}
              {props.urlImport.status === 'error' && <p className="manual-helper error">{props.urlImport.error}</p>}
              {props.urlImport.status === 'done' && urlResult && (
                <div className="url-ingest-result">
                  <strong>{urlResult.representativeImageUrl ? '대표 이미지를 찾았습니다.' : '대표 이미지를 찾지 못했습니다.'}</strong>
                  {urlResult.productTitle && <p>{urlResult.productTitle}</p>}
                  {selectedUrlImage && <img className="url-ingest-thumbnail" src={selectedUrlImage} alt={urlResult.productTitle ?? '대표 이미지 미리보기'} />}
                  {urlResult.candidateImageUrls.length > 1 && (
                    <div className="url-ingest-gallery" role="listbox" aria-label="가져온 이미지 후보">
                      {urlResult.candidateImageUrls.map((candidateUrl) => (
                        <button
                          key={candidateUrl}
                          type="button"
                          role="option"
                          aria-selected={candidateUrl === selectedUrlImage}
                          className={candidateUrl === selectedUrlImage ? 'url-ingest-gallery-item active' : 'url-ingest-gallery-item'}
                          onClick={() => props.onSelectUrlImage(candidateUrl)}
                        >
                          <img src={candidateUrl} alt="후보 이미지" />
                        </button>
                      ))}
                    </div>
                  )}
                  {urlResult.candidateImageUrls.length > 1 && <p className="manual-helper">흰 배경 단독컷처럼 분석에 적합한 사진을 골라주세요.</p>}
                  {selectedUrlImage ? (
                    <button className="button primary" type="button" disabled={props.urlImport.adoptStatus === 'processing' || props.backgroundRemoveStatus === 'processing'} onClick={handleAdoptUrlImage}>
                      {props.urlImport.adoptStatus === 'processing' ? '이미지 가져오는 중' : props.backgroundRemoveStatus === 'processing' ? '사진 분석 중' : '이 이미지 분석하기'}
                    </button>
                  ) : <p>이미지 주소를 직접 붙여넣거나 사진 업로드를 이용해 주세요.</p>}
                  {props.urlImport.adoptStatus === 'error' && <p className="manual-helper error">{props.urlImport.adoptError}</p>}
                </div>
              )}
            </div>
          )}
          <input ref={props.fileInputRef} type="file" accept="image/*" hidden onChange={props.onFileChange} />
          <input ref={props.cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={props.onFileChange} />
        </section>

        <div className="analysis-summary">
          <section className="glass-panel summary-hero">
            <div>
              <span className="page-kicker">{props.manual.aiAnalyzed ? 'Analysis Ready' : 'Waiting for Image'}</span>
              <h2>{props.manual.aiAnalyzed ? props.manual.type : '사진을 먼저 추가해 주세요.'}</h2>
              <p>{props.manual.aiAnalyzed ? '자동으로 채운 정보를 확인하고 바로 저장하거나, 다른 부분만 수정할 수 있습니다.' : '사진을 분석하면 카테고리, 색상, 소재, 계절 초안을 여기에 보여줍니다.'}</p>
            </div>
            {props.manual.aiConfidence !== null && props.manual.aiConfidence !== undefined && <span className="confidence">{Math.round(props.manual.aiConfidence * 100)}%</span>}
          </section>

          <section className="panel">
            <div className="section-head">
              <div><h2>분석 요약</h2><small>자동 입력된 정보</small></div>
              <button className="button secondary" type="button" disabled={!props.manual.imageUrl} onClick={() => setDetailsOpen(true)}>정보 수정</button>
            </div>
            <div className="detected-grid">
              <span className="detected-item"><small>카테고리</small><strong>{props.manual.category} · {props.manual.type}</strong></span>
              <span className="detected-item"><small>소재</small><strong>{MATERIAL_LABELS[structuredMeta.material]}</strong></span>
              <span className="detected-item"><small>계절</small><strong>{props.manual.predictedSeasonTag && props.manual.predictedSeasonTag !== '미분류' ? props.manual.predictedSeasonTag : props.manual.seasonTag}</strong></span>
              <span className="detected-item"><small>패턴</small><strong>{PATTERN_LABELS[structuredMeta.patternType]}</strong></span>
            </div>
          </section>

          <section className="panel">
            <div className="section-head"><div><h2>추출 색상</h2><small>대표색과 보조색 비율</small></div>{detectedColors.length > 0 && props.personalColorResult && <button className="button ghost" type="button" onClick={() => setSelectedInsightHex(detectedColors[0].hex ?? selectedColorMeta.hex)}>상세 분석</button>}</div>
            {detectedColors.length > 0 ? (
              <>
                <div className="dominant-bar" aria-label="추출된 색상">
                  {detectedColors.map((color: ClothingColorAnalysis, index: number) => {
                    const hex = color.hex ?? '#A0A5AA';
                    return (
                      <button
                        className="dominant-color-button"
                        style={{ flex: Math.max(color.ratio ?? 0.05, 0.05), backgroundColor: hex }}
                        key={hex + '-' + index}
                        type="button"
                        title={hex + ' · ' + Math.round((color.ratio ?? 0) * 100) + '%'}
                        onClick={() => openDetectedColor(hex)}
                      >
                        <span>{hex}</span><small>{Math.round((color.ratio ?? 0) * 100)}%</small>
                      </button>
                    );
                  })}
                </div>
                <p className="dominant-color-hint">{props.personalColorResult ? '색상 블록을 누르면 같은 분석 레이어에서 스펙트럼을 비교합니다.' : '퍼컬 진단 후 각 색의 상세 적합도를 확인할 수 있습니다.'}</p>
              </>
            ) : <p className="manual-helper">사진 분석이 끝나면 대표색과 보조색이 표시됩니다.</p>}
          </section>

          <section className="panel manual-save-panel">
            <div><h2>옷장에 저장</h2><small>분석 결과는 정보 수정에서 확인할 수 있습니다.</small></div>
            <button className="button primary" type="button" disabled={!props.manual.imageUrl} onClick={props.onSaveManual}>옷장에 저장</button>
          </section>
        </div>
      </div>

      {detailsOpen && (
        <div className="manual-sheet-backdrop" role="presentation" onClick={() => setDetailsOpen(false)}>
          <section className="manual-edit-sheet" role="dialog" aria-modal="true" aria-label="옷 상세 정보 수정" style={{ transform: 'translateY(' + sheetOffset + 'px)' }} onClick={(event) => event.stopPropagation()}>
            <button
              className="manual-sheet-handle"
              type="button"
              aria-label="아래로 끌어 정보 수정 닫기"
              onPointerDown={startSheetDrag}
              onPointerMove={moveSheet}
              onPointerUp={endSheetDrag}
              onPointerCancel={endSheetDrag}
            ><i /></button>
            <header className="manual-sheet-head"><div><span className="page-kicker">Manual Edit</span><h2>정보 수정</h2><p>분석 결과와 다른 항목만 바꿔 주세요.</p></div><button className="button icon-only ghost" type="button" onClick={() => setDetailsOpen(false)} aria-label="정보 수정 닫기"><X className="icon" /></button></header>
            <div className="manual-sheet-body form-grid manual-form">
              <fieldset className="category-picker">
                <legend>카테고리</legend>
                <div>{CATEGORY_OPTIONS.map((category) => {
                  const meta = CATEGORY_UI_META[category];
                  return <button className={props.manual.category === category ? 'active' : ''} key={category} type="button" onClick={() => props.onCategory(category)}><strong>{meta.label}</strong><small>{meta.hint}</small></button>;
                })}</div>
              </fieldset>
              <label>종류<select value={props.manual.type} onChange={(event) => props.setManual((prev: any) => ({ ...prev, type: event.target.value }))}>{TYPES[props.manual.category as ClothingCategory].map((item) => <option key={item}>{item}</option>)}</select></label>
              <fieldset className="color-picker">
                <legend>색상</legend>
                <div className="selected-color-summary"><i style={{ backgroundColor: selectedColorMeta.hex }} /><span><strong>{isHexColor(props.manual.color) ? '감지 원색' : props.manual.color}</strong><small>{selectedColorMeta.hex}</small></span></div>
                <div className="color-picker-grid">{Object.entries(COLOR_META).map(([name, meta]) => <button className={props.manual.color === name ? 'active' : ''} key={name} type="button" onClick={() => props.setManual((prev: any) => ({ ...prev, color: name }))}><i style={{ backgroundColor: meta.hex }} /><span>{name}</span><small>{meta.hex}</small></button>)}</div>
              </fieldset>
              <label>사이즈<select value={props.manual.size} onChange={(event) => props.setManual((prev: any) => ({ ...prev, size: event.target.value }))}>{sizes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>브랜드<input value={props.manual.brand} onChange={(event) => props.setManual((prev: any) => ({ ...prev, brand: event.target.value }))} placeholder="선택 입력" /></label>
              <label>계절 태그<select value={props.manual.seasonTag} onChange={(event) => props.setManual((prev: any) => ({ ...prev, seasonTag: event.target.value }))}>{SEASON_TAGS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>보유 상태<select value={props.manual.availabilityStatus} onChange={(event) => props.setManual((prev: any) => ({ ...prev, availabilityStatus: event.target.value }))}>{AVAILABILITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <footer className="manual-sheet-footer"><button className="button primary" type="button" onClick={() => setDetailsOpen(false)}>수정 완료</button></footer>
          </section>
        </div>
      )}

      {selectedInsight && (
        <ColorInsightModal
          insight={selectedInsight}
          itemName={props.manual.type || '추가할 옷'}
          dominantHexes={detectedColors.map((color: ClothingColorAnalysis) => color.hex).filter(Boolean) as string[]}
          activeHex={selectedInsightHex}
          onSelectHex={setSelectedInsightHex}
          onClose={() => setSelectedInsightHex('')}
        />
      )}
    </section>
  );
}

// 추천 페이지입니다. 날씨, 목적 모드, 옷장 선택값을 바탕으로 코디 추천 리스트를 보여줍니다.
