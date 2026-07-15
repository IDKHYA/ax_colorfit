// 룩 보관함 폴더의 정규화, 이동, 즐겨찾기, 이름 변경, 삭제 규칙을 검증합니다.
import { describe, expect, it } from 'vitest';
import type { SavedLookFolder, SavedOutfit } from '../wardrobeTypes';

const legacyOutfit: SavedOutfit = {
  id: 'saved-legacy',
  title: '예전 데일리룩',
  score: 82,
  itemIds: [],
  colorHexes: [],
  weatherBand: '상관없음',
  mode: '출근',
  savedAt: '2026-07-01T00:00:00.000Z',
};

const customFolder: SavedLookFolder = {
  id: 'folder-trip',
  name: '여행',
  tint: '#E7F0D9',
  createdAt: '2026-07-02T00:00:00.000Z',
};

describe('룩 보관함 폴더 저장 계약', () => {
  it('기본 폴더와 사용자 폴더를 중복 없이 정규화한다', async () => {
    const module = await import('./useSavedOutfits');
    const folders = module.normalizeSavedLookFolders([
      { id: 'folder-office', name: '중복 출근', tint: '#000000', createdAt: '2026-07-01T00:00:00.000Z' },
      customFolder,
    ]);

    expect(folders.filter((folder) => folder.id === 'folder-office')).toHaveLength(1);
    expect(folders.some((folder) => folder.id === customFolder.id && folder.name === customFolder.name)).toBe(true);
  });

  it('폴더가 없는 예전 저장 룩을 상황 기본 폴더로 보정한다', async () => {
    const module = await import('./useSavedOutfits');
    const [normalized] = module.normalizeSavedOutfits([legacyOutfit]);

    expect(normalized.folderId).toBe('folder-office');
    expect(normalized.isFavorite).toBe(false);
  });

  it('저장 룩을 폴더로 이동하고 즐겨찾기를 전환한다', async () => {
    const module = await import('./useSavedOutfits');
    const moved = module.moveSavedOutfitToFolder([legacyOutfit], legacyOutfit.id, 'folder-daily');

    expect(moved[0].folderId).toBe('folder-daily');

    const favorited = module.toggleSavedOutfitFavorite(moved, legacyOutfit.id);
    expect(favorited[0].isFavorite).toBe(true);
    expect(module.toggleSavedOutfitFavorite(favorited, legacyOutfit.id)[0].isFavorite).toBe(false);
  });

  it('사용자 폴더 이름만 공백을 정리해 변경한다', async () => {
    const module = await import('./useSavedOutfits');
    const folders = module.renameSavedLookFolderState(
      module.normalizeSavedLookFolders([customFolder]),
      customFolder.id,
      '  여름 여행  ',
    );

    expect(folders.find((folder) => folder.id === customFolder.id)?.name).toBe('여름 여행');
    expect(module.renameSavedLookFolderState(folders, 'folder-daily', '기본 폴더 변경')).toEqual(folders);
  });

  it('사용자 폴더를 삭제하면 내부 룩을 데일리 폴더로 이동한다', async () => {
    const module = await import('./useSavedOutfits');
    const folders = module.normalizeSavedLookFolders([customFolder]);
    const outfit = { ...legacyOutfit, folderId: customFolder.id };
    const result = module.deleteSavedLookFolderState(folders, [outfit], customFolder.id);

    expect(result.folders.some((folder) => folder.id === customFolder.id)).toBe(false);
    expect(result.outfits[0].folderId).toBe('folder-daily');

    const protectedResult = module.deleteSavedLookFolderState(folders, [outfit], 'folder-daily');
    expect(protectedResult.folders).toEqual(folders);
    expect(protectedResult.outfits).toEqual([outfit]);
  });
});
