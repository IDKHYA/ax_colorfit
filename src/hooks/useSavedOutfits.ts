// 저장한 코디, 룩 보관함 폴더, 데일리룩 편집 상태를 관리하는 훅입니다.
import { useState } from 'react';
import { buildDailyLookState } from '../services/dailyLook';
import type { DailyLookState, OutfitRecommendation, SavedLookFolder, SavedOutfit, ScoredClothingItem } from '../wardrobeTypes';
import { DEFAULT_SAVED_LOOK_FOLDERS } from '../wardrobeConstants';
import { localAppPersistence } from '../services/appPersistence';

const savedOutfitPersistence = localAppPersistence.savedOutfit;
const FOLDER_TINTS = ['#E7F0D9', '#E9E2F6', '#DCEFF2', '#F7E6D4'];
const SYSTEM_FOLDER_IDS = new Set(DEFAULT_SAVED_LOOK_FOLDERS.map((folder) => folder.id));

function defaultFolderIdForMode(mode: SavedOutfit['mode']): string {
  if (mode === '출근' || mode === '발표') return 'folder-office';
  if (mode === '데이트') return 'folder-date';
  return 'folder-daily';
}

export function normalizeSavedLookFolders(folders: SavedLookFolder[]): SavedLookFolder[] {
  const seen = new Set<string>();
  return [...DEFAULT_SAVED_LOOK_FOLDERS, ...folders].filter((folder) => {
    const id = folder.id.trim();
    const name = folder.name.trim();
    if (!id || !name || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((folder) => ({ ...folder, name: folder.name.trim() }));
}

export function normalizeSavedOutfits(outfits: SavedOutfit[]): SavedOutfit[] {
  return outfits.map((outfit) => ({
    ...outfit,
    folderId: outfit.folderId || defaultFolderIdForMode(outfit.mode),
    isFavorite: Boolean(outfit.isFavorite),
  }));
}

export function moveSavedOutfitToFolder(savedOutfits: SavedOutfit[], id: string, folderId: string): SavedOutfit[] {
  return savedOutfits.map((outfit) => outfit.id === id ? { ...outfit, folderId } : outfit);
}

export function toggleSavedOutfitFavorite(savedOutfits: SavedOutfit[], id: string): SavedOutfit[] {
  return savedOutfits.map((outfit) => outfit.id === id ? { ...outfit, isFavorite: !outfit.isFavorite } : outfit);
}

export function renameSavedLookFolderState(folders: SavedLookFolder[], id: string, name: string): SavedLookFolder[] {
  const normalizedName = name.trim();
  if (!normalizedName || SYSTEM_FOLDER_IDS.has(id)) return folders;
  if (folders.some((folder) => folder.id !== id && folder.name.toLocaleLowerCase('ko-KR') === normalizedName.toLocaleLowerCase('ko-KR'))) return folders;
  return folders.map((folder) => folder.id === id ? { ...folder, name: normalizedName } : folder);
}

export function deleteSavedLookFolderState(
  folders: SavedLookFolder[],
  outfits: SavedOutfit[],
  id: string,
): { folders: SavedLookFolder[]; outfits: SavedOutfit[] } {
  if (SYSTEM_FOLDER_IDS.has(id) || !folders.some((folder) => folder.id === id)) return { folders, outfits };
  return {
    folders: folders.filter((folder) => folder.id !== id),
    outfits: outfits.map((outfit) => outfit.folderId === id ? { ...outfit, folderId: 'folder-daily' } : outfit),
  };
}

export function applySavedOutfitDailyLookUpdate(
  savedOutfits: SavedOutfit[],
  dailyLookSourceItems: ScoredClothingItem[],
  id: string,
  dailyLookState: DailyLookState,
  itemIds?: string[],
) {
  const sourceMap = new Map<string, ScoredClothingItem>(dailyLookSourceItems.map((item) => [item.id, item]));
  return savedOutfits.map((outfit) => {
    if (outfit.id !== id) return outfit;
    if (!itemIds) return { ...outfit, dailyLookState };

    const nextItemIds = Array.from(new Set(itemIds));
    return {
      ...outfit,
      itemIds: nextItemIds,
      colorHexes: nextItemIds.map((itemId) => sourceMap.get(itemId)?.representativeHex).filter(Boolean) as string[],
      dailyLookState,
    };
  });
}

export function useSavedOutfits(dailyLookSourceItems: ScoredClothingItem[]) {
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(() => normalizeSavedOutfits(savedOutfitPersistence.loadAll()));
  const [savedLookFolders, setSavedLookFolders] = useState<SavedLookFolder[]>(() =>
    normalizeSavedLookFolders(savedOutfitPersistence.loadFolders(DEFAULT_SAVED_LOOK_FOLDERS)),
  );
  const [activeTryOnOutfitId, setActiveTryOnOutfitId] = useState<string | null>(null);

  const persistOutfits = (next: SavedOutfit[]) => {
    setSavedOutfits(next);
    savedOutfitPersistence.saveAll(next);
  };

  const saveOutfit = (outfit: OutfitRecommendation) => {
    const key = outfit.items.map((item) => item.id).join(',');
    if (savedOutfits.some((saved) => saved.itemIds.join(',') === key)) return;
    const next = [{
      id: 'saved-' + Date.now(),
      title: outfit.title,
      score: outfit.score,
      itemIds: outfit.items.map((item) => item.id),
      colorHexes: outfit.items.map((item) => item.representativeHex),
      weatherBand: outfit.weatherBand,
      mode: outfit.mode,
      savedAt: new Date().toISOString(),
      explanationBullets: outfit.explanationBullets,
      folderId: defaultFolderIdForMode(outfit.mode),
      isFavorite: false,
      dailyLookState: buildDailyLookState(outfit.items),
    }, ...savedOutfits];
    persistOutfits(next);
  };

  const deleteSavedOutfit = (id: string) => {
    persistOutfits(savedOutfits.filter((outfit) => outfit.id !== id));
  };

  const updateSavedOutfitDailyLook = (id: string, dailyLookState: DailyLookState, itemIds?: string[]) => {
    persistOutfits(applySavedOutfitDailyLookUpdate(savedOutfits, dailyLookSourceItems, id, dailyLookState, itemIds));
  };

  const createBlankDailyLook = () => {
    const outfit: SavedOutfit = {
      id: 'saved-' + Date.now(),
      title: '새 데일리룩',
      score: 0,
      itemIds: [],
      colorHexes: [],
      weatherBand: '상관없음',
      mode: '데일리',
      savedAt: new Date().toISOString(),
      folderId: 'folder-daily',
      isFavorite: false,
      dailyLookState: buildDailyLookState([]),
    };
    persistOutfits([outfit, ...savedOutfits]);
    setActiveTryOnOutfitId(outfit.id);
    return outfit.id;
  };

  const createSavedLookFolder = (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;
    const existing = savedLookFolders.find((folder) => folder.name.toLocaleLowerCase('ko-KR') === normalizedName.toLocaleLowerCase('ko-KR'));
    if (existing) return existing.id;

    const folder: SavedLookFolder = {
      id: 'folder-' + Date.now().toString(36),
      name: normalizedName,
      tint: FOLDER_TINTS[savedLookFolders.length % FOLDER_TINTS.length],
      createdAt: new Date().toISOString(),
    };
    const next = [...savedLookFolders, folder];
    setSavedLookFolders(next);
    savedOutfitPersistence.saveFolders(next);
    return folder.id;
  };

  const moveSavedOutfit = (id: string, folderId: string) => {
    if (!savedLookFolders.some((folder) => folder.id === folderId)) return;
    persistOutfits(moveSavedOutfitToFolder(savedOutfits, id, folderId));
  };

  const renameSavedLookFolder = (id: string, name: string) => {
    const next = renameSavedLookFolderState(savedLookFolders, id, name);
    if (next === savedLookFolders) return false;
    setSavedLookFolders(next);
    savedOutfitPersistence.saveFolders(next);
    return true;
  };

  const deleteSavedLookFolder = (id: string) => {
    const next = deleteSavedLookFolderState(savedLookFolders, savedOutfits, id);
    if (next.folders === savedLookFolders) return false;
    setSavedLookFolders(next.folders);
    savedOutfitPersistence.saveFolders(next.folders);
    persistOutfits(next.outfits);
    return true;
  };

  const toggleSavedOutfitFavoriteState = (id: string) => {
    persistOutfits(toggleSavedOutfitFavorite(savedOutfits, id));
  };

  const openDailyLookMaker = (id: string) => {
    setActiveTryOnOutfitId(id);
  };

  const resetSavedOutfits = () => {
    setSavedOutfits([]);
    setSavedLookFolders(DEFAULT_SAVED_LOOK_FOLDERS);
    savedOutfitPersistence.clear();
    setActiveTryOnOutfitId(null);
  };

  return {
    savedOutfits,
    savedLookFolders,
    activeTryOnOutfitId,
    saveOutfit,
    deleteSavedOutfit,
    updateSavedOutfitDailyLook,
    createBlankDailyLook,
    createSavedLookFolder,
    renameSavedLookFolder,
    deleteSavedLookFolder,
    moveSavedOutfit,
    toggleSavedOutfitFavorite: toggleSavedOutfitFavoriteState,
    openDailyLookMaker,
    resetSavedOutfits,
  };
}
