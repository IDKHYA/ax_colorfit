// 카탈로그에서 바로 데일리룩에 추가한 아이템도 실제로 자동 누끼 처리되는지 검증합니다.
//
// 버그: ensureDailyLookCutouts는 clothingItems(실제 옷장 배열)만 대상 id로 찾는다. 그런데
// "카탈로그에서 데일리룩 만들기"로 추가한 아이템은 id가 `catalog-dailylook-<catalogItemId>` 형태이고
// 실제 옷장에는 존재하지 않아, 대상 목록(targets)이 항상 비어 API 호출 자체가 조용히 스킵된다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('카탈로그 데일리룩 아이템 자동 누끼 처리', () => {
  const source = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');

  function extractFunctionBody(startMarker: string, endMarker: string) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    if (start === -1 || end === -1) throw new Error(`marker not found: ${startMarker} / ${endMarker}`);
    return source.slice(start, end);
  }

  it('ensureDailyLookCutouts는 catalog-dailylook- id도 실제 처리 대상으로 다룬다', () => {
    const body = extractFunctionBody('const ensureDailyLookCutouts', 'const resetAllData');
    expect(body).toContain('CATALOG_DAILYLOOK_PREFIX');
    expect(source).toContain("CATALOG_DAILYLOOK_PREFIX = 'catalog-dailylook-'");
  });

  it('카탈로그 데일리룩 누끼 결과를 저장할 캐시 상태가 있고 dailyLookSourceItems가 이를 반영한다', () => {
    expect(source).toContain('catalogCutoutCache');
    const dailyLookSourceBlock = extractFunctionBody('const dailyLookSourceItems', 'const { savedOutfits');
    expect(dailyLookSourceBlock).toContain('catalogCutoutCache');
  });
});
