// 저장한 코디를 폴더와 즐겨찾기로 정리하는 룩 보관함 화면입니다.
import { useMemo, useState } from 'react';
import { Bookmark, Check, Folder, FolderPlus, Heart, Plus, Search, Shirt, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common';
import { clothingDisplayImage, displayClothingColor } from '../../services/clothingDisplay';
import { normalizePatternType } from '../../services/clothingMeta';
import { buildDailyLookState } from '../../services/dailyLook';
import type { RecommendationWeatherBand, SavedLookFolder, SavedOutfit, ScoredClothingItem, Wardrobe } from '../../wardrobeTypes';
import { DEFAULT_SAVED_LOOK_FOLDERS, MATERIAL_LABELS, PATTERN_LABELS } from '../../wardrobeConstants';

function DailyLookBoardPreview({ outfit, items }: { outfit: SavedOutfit; items: ScoredClothingItem[] }) {
  const itemById = new Map<string, ScoredClothingItem>(items.map((item) => [item.id, item]));
  const state = outfit.dailyLookState ?? buildDailyLookState(outfit.itemIds.map((id) => itemById.get(id)).filter(Boolean) as ScoredClothingItem[]);
  return (
    <div className="look-thumb saved-dailylook-board" aria-label={outfit.title + ' 자동 배치 미리보기'}>
      {[...state.layers].filter((layer) => layer.visible).sort((left, right) => left.zIndex - right.zIndex).map((layer) => {
        const item = itemById.get(layer.itemId);
        if (!item) return null;
        return (
          <div
            className="saved-board-layer"
            key={layer.itemId}
            style={{
              left: (layer.x / state.canvas.width) * 100 + '%',
              top: (layer.y / state.canvas.height) * 100 + '%',
              transform: 'translate(-50%, -50%) rotate(' + layer.rotation + 'deg) scale(' + layer.scale + ')',
              zIndex: layer.zIndex,
            }}
          >
            <img src={clothingDisplayImage(item)} alt={item.type} />
          </div>
        );
      })}
    </div>
  );
}

type SavedOutfitSort = 'recent' | 'score' | 'weather' | 'title';
type FolderFilter = 'all' | 'favorites' | string;

const SYSTEM_FOLDER_IDS = new Set(DEFAULT_SAVED_LOOK_FOLDERS.map((folder) => folder.id));

const WEATHER_SORT_ORDER: Record<RecommendationWeatherBand, number> = {
  '상관없음': 0,
  '4도 이하': 1,
  '5~8도': 2,
  '9~11도': 3,
  '12~16도': 4,
  '17~19도': 5,
  '20~22도': 6,
  '23~27도': 7,
  '28도 이상': 8,
};

export function SavedOutfits({
  saved,
  folders,
  items,
  wardrobes,
  onDelete,
  onMakeDailyLook,
  onCreateDailyLook,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveToFolder,
  onToggleFavorite,
  onOpenWardrobe,
}: {
  saved: SavedOutfit[];
  folders: SavedLookFolder[];
  items: ScoredClothingItem[];
  wardrobes: Wardrobe[];
  onDelete: (id: string) => void;
  onMakeDailyLook: (id: string) => void;
  onCreateDailyLook: () => void;
  onCreateFolder: (name: string) => string | null;
  onRenameFolder: (id: string, name: string) => boolean;
  onDeleteFolder: (id: string) => boolean;
  onMoveToFolder: (id: string, folderId: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenWardrobe: (wardrobeId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SavedOutfitSort>('recent');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [folderDraft, setFolderDraft] = useState('');
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [folderManageOpen, setFolderManageOpen] = useState(false);
  const [folderRenameDrafts, setFolderRenameDrafts] = useState<Record<string, string>>({});
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const wardrobeNameById = useMemo(() => new Map(wardrobes.map((wardrobe) => [wardrobe.id, wardrobe.name])), [wardrobes]);
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const savedWithItems = useMemo(() => saved.map((outfit) => ({
    outfit,
    outfitItems: outfit.itemIds.map((id) => itemById.get(id)).filter(Boolean) as ScoredClothingItem[],
  })), [itemById, saved]);

  const filteredSaved = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const inFolder = savedWithItems.filter(({ outfit }) => {
      if (folderFilter === 'all') return true;
      if (folderFilter === 'favorites') return Boolean(outfit.isFavorite);
      return outfit.folderId === folderFilter;
    });
    const filtered = normalizedQuery
      ? inFolder.filter(({ outfit, outfitItems }) => {
        const haystack = [
          outfit.title,
          outfit.mode,
          outfit.weatherBand,
          folderById.get(outfit.folderId ?? '')?.name ?? '',
          ...outfitItems.flatMap((item) => [item.type, item.color, item.brand, item.category, wardrobeNameById.get(item.wardrobeId) ?? '']),
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      : inFolder;

    return [...filtered].sort((left, right) => {
      if (sort === 'score') return right.outfit.score - left.outfit.score;
      if (sort === 'weather') return WEATHER_SORT_ORDER[left.outfit.weatherBand] - WEATHER_SORT_ORDER[right.outfit.weatherBand];
      if (sort === 'title') return left.outfit.title.localeCompare(right.outfit.title, 'ko-KR');
      return new Date(right.outfit.savedAt).getTime() - new Date(left.outfit.savedAt).getTime();
    });
  }, [folderById, folderFilter, query, savedWithItems, sort, wardrobeNameById]);

  const createFolder = () => {
    const id = onCreateFolder(folderDraft);
    if (!id) return;
    setFolderFilter(id);
    setFolderDraft('');
    setFolderCreateOpen(false);
  };

  const folderCount = (id: string) => saved.filter((outfit) => outfit.folderId === id).length;
  const customFolders = folders.filter((folder) => !SYSTEM_FOLDER_IDS.has(folder.id));

  const toggleFolderManager = () => {
    if (!folderManageOpen) setFolderRenameDrafts(Object.fromEntries(customFolders.map((folder) => [folder.id, folder.name])));
    setFolderManageOpen((prev) => !prev);
  };

  const renameFolder = (id: string) => {
    const nextName = folderRenameDrafts[id] ?? '';
    if (onRenameFolder(id, nextName)) {
      setFolderRenameDrafts((prev) => ({ ...prev, [id]: nextName.trim() }));
    }
  };

  const deleteFolder = (id: string) => {
    const label = folderById.get(id)?.name ?? '폴더';
    const count = folderCount(id);
    const message = count > 0
      ? `'${label}' 폴더를 삭제할까요? 안에 저장된 룩 ${count}개는 데일리 폴더로 이동합니다.`
      : `'${label}' 폴더를 삭제할까요?`;
    if (!window.confirm(message)) return;
    if (!onDeleteFolder(id)) return;
    if (folderFilter === id) setFolderFilter('all');
    setFolderRenameDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <section className="saved-page colorfit-saved">
      <section className="glass-panel vault-head">
        <span className="page-kicker">My Look Archive</span>
        <h1>나의 룩 보관함</h1>
        <p>추천에서 저장한 코디와 직접 만든 데일리룩을 상황별 폴더에 정리합니다.</p>
        <button className="button primary" type="button" onClick={onCreateDailyLook}><Plus className="icon" />빈 룩 만들기</button>
      </section>

      <div className="folder-row" aria-label="룩 폴더">
        <button className={folderFilter === 'all' ? 'folder-card active' : 'folder-card'} type="button" onClick={() => setFolderFilter('all')}>
          <span className="folder-icon"><Folder className="icon" /></span><span><strong>전체</strong><small>{saved.length}개</small></span>
        </button>
        <button className={folderFilter === 'favorites' ? 'folder-card active' : 'folder-card'} type="button" onClick={() => setFolderFilter('favorites')}>
          <span className="folder-icon favorite"><Heart className="icon" /></span><span><strong>즐겨찾기</strong><small>{saved.filter((outfit) => outfit.isFavorite).length}개</small></span>
        </button>
        {folders.map((folder) => {
          const isCustom = !SYSTEM_FOLDER_IDS.has(folder.id);
          return (
            <div
              className="folder-card-wrap"
              key={folder.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => { if (isCustom) setHoveredFolderId(folder.id); }}
              onMouseLeave={() => setHoveredFolderId((prev) => (prev === folder.id ? null : prev))}
            >
              <button className={folderFilter === folder.id ? 'folder-card active' : 'folder-card'} type="button" style={{ width: '100%' }} onClick={() => setFolderFilter(folder.id)}>
                <span className="folder-icon" style={{ backgroundColor: folder.tint }}><Folder className="icon" /></span><span><strong>{folder.name}</strong><small>{folderCount(folder.id)}개</small></span>
              </button>
              {isCustom && hoveredFolderId === folder.id && (
                <button
                  className="button icon-only danger"
                  type="button"
                  style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2 }}
                  onClick={() => deleteFolder(folder.id)}
                  aria-label={folder.name + ' 폴더 삭제'}
                  title="폴더 삭제"
                >
                  <Trash2 className="icon" />
                </button>
              )}
            </div>
          );
        })}
        <button className="folder-card folder-create-card" type="button" onClick={() => setFolderCreateOpen((prev) => !prev)}>
          <span className="folder-icon new"><FolderPlus className="icon" /></span><span><strong>새 폴더</strong><small>직접 분류</small></span>
        </button>
      </div>

      {folderCreateOpen && (
        <section className="panel folder-create-panel">
          <label><span>폴더 이름</span><input value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)} placeholder="예: 여행 코디" onKeyDown={(event) => { if (event.key === 'Enter') createFolder(); }} /></label>
          <button className="button ghost" type="button" onClick={() => { setFolderDraft(''); setFolderCreateOpen(false); }}>취소</button>
          <button className="button primary" type="button" disabled={!folderDraft.trim()} onClick={createFolder}>폴더 만들기</button>
        </section>
      )}

      {folderManageOpen && (
        <section className="panel folder-manage-panel">
          <div className="section-head"><div><h2>사용자 폴더 관리</h2><small>기본 폴더는 이름 변경과 삭제에서 제외됩니다.</small></div><button className="button ghost" type="button" onClick={() => setFolderManageOpen(false)}>닫기</button></div>
          {customFolders.length === 0 ? <p>관리할 사용자 폴더가 없습니다.</p> : (
            <div className="folder-manage-list">
              {customFolders.map((folder) => (
                <div className="folder-manage-row" key={folder.id}>
                  <span className="folder-icon" style={{ backgroundColor: folder.tint }}><Folder className="icon" /></span>
                  <label><span>폴더 이름</span><input value={folderRenameDrafts[folder.id] ?? folder.name} onChange={(event) => setFolderRenameDrafts((prev) => ({ ...prev, [folder.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') renameFolder(folder.id); }} /></label>
                  <button className="button secondary" type="button" onClick={() => renameFolder(folder.id)}><Check className="icon" />저장</button>
                  <button className="button danger" type="button" onClick={() => deleteFolder(folder.id)}><Trash2 className="icon" />삭제</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="toolbar saved-toolbar">
        <label className="search"><Search className="icon" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="저장 룩 검색" /></label>
        <button className="button secondary" type="button" onClick={toggleFolderManager}>폴더 관리</button>
        <label className="saved-sort"><span>정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as SavedOutfitSort)}><option value="recent">최근 저장순</option><option value="score">점수순</option><option value="weather">날씨순</option><option value="title">이름순</option></select></label>
      </div>

      {saved.length === 0 ? (
        <EmptyState title="저장된 데일리룩이 없습니다." description="추천에서 마음에 드는 조합을 저장하거나 빈 룩을 만들어 보세요." action={<button className="button primary" type="button" onClick={onCreateDailyLook}><Plus className="icon" />빈 룩 만들기</button>} />
      ) : (
        <div className="saved-grid">
          {filteredSaved.map(({ outfit, outfitItems }) => {
            const folderName = folderById.get(outfit.folderId ?? '')?.name ?? '미분류';
            const isConfirmed = Boolean(outfit.dailyLookState?.isConfirmed);
            return (
              <article className="saved-card card" key={outfit.id}>
                <div className="saved-look-media">
                  {outfit.dailyLookState?.confirmedImage
                    ? <img className="look-thumb dailylook-confirmed-thumb" src={outfit.dailyLookState.confirmedImage} alt={outfit.title + ' 완성 이미지'} />
                    : <DailyLookBoardPreview outfit={outfit} items={items} />}
                  <button className={outfit.isFavorite ? 'saved-favorite active' : 'saved-favorite'} type="button" onClick={() => onToggleFavorite(outfit.id)} aria-label={outfit.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'} title={outfit.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}><Heart className="icon" fill={outfit.isFavorite ? 'currentColor' : 'none'} /></button>
                </div>
                <div className="saved-card-body">
                  <span className="page-kicker">{outfit.isFavorite ? 'Favorite' : isConfirmed ? 'Completed' : outfit.mode}</span>
                  <h3>{outfit.title}</h3>
                  <p>{outfit.explanationBullets?.[0] ?? '직접 구성한 데일리룩입니다.'}</p>
                  <div className="saved-palette">{outfit.colorHexes.map((hex, index) => <i key={hex + '-' + index} style={{ backgroundColor: hex }} title={hex} />)}</div>
                  <div className="saved-meta"><span>{folderName}</span><span>{outfitItems.length}벌 · {outfit.score}점</span></div>
                  <label className="saved-folder-select"><span>폴더</span><select value={outfit.folderId ?? folders[0]?.id ?? ''} onChange={(event) => onMoveToFolder(outfit.id, event.target.value)}>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
                  <details className="saved-outfit-detail">
                    <summary>구성 보기</summary>
                    <div className="saved-item-preview-grid">
                      {outfitItems.map((item) => (
                        <figure key={item.id}>
                          <img src={clothingDisplayImage(item)} alt={item.type} />
                          <figcaption><strong>{item.type}</strong><small>{displayClothingColor(item)} · {MATERIAL_LABELS[item.material ?? 'unknown']} · {PATTERN_LABELS[normalizePatternType(item.patternType)]}</small><button type="button" onClick={() => onOpenWardrobe(item.wardrobeId)}>{wardrobeNameById.get(item.wardrobeId) ?? '옷장'}에서 보기</button></figcaption>
                        </figure>
                      ))}
                    </div>
                  </details>
                  <div className="saved-card-actions">
                    <button className="button secondary" type="button" onClick={() => onMakeDailyLook(outfit.id)}><Shirt className="icon" />편집하기</button>
                    <button className="button icon-only danger" type="button" onClick={() => onDelete(outfit.id)} aria-label="룩 삭제" title="룩 삭제"><Trash2 className="icon" /></button>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredSaved.length === 0 && <EmptyState title="이 폴더에 저장된 룩이 없습니다." description="다른 폴더를 선택하거나 검색어를 지워 주세요." />}
        </div>
      )}
    </section>
  );
}
