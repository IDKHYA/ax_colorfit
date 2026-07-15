// 신규 사용자 초기 상태(FR-001)와 명시적 데모 모드에서만 데모 결과가 쓰이는지 검증합니다.
import { describe, expect, it } from 'vitest';
import type { FinalResult } from '../types';

describe('신규 사용자 초기 상태(FR-001)', () => {
  it('저장된 퍼컬 결과가 없고 데모 모드가 아니면 personalColorResult가 null이다', async () => {
    const { getInitialPersonalColorState } = await import('./demoUserData');

    const state = getInitialPersonalColorState(null, [], false);

    expect(state.result).toBeNull();
    expect(state.history).toEqual([]);
  });

  it('일반 실행 기준값(demoModeEnabled 인자 생략)에서도 데모 결과가 자동 적용되지 않는다', async () => {
    const { getInitialPersonalColorState } = await import('./demoUserData');

    const state = getInitialPersonalColorState(null, []);

    expect(state.result).toBeNull();
  });

  it('명시적 데모 모드에서만 soft-summer 데모 결과를 제공한다', async () => {
    const { getInitialPersonalColorState, SOFT_SUMMER_DEMO_RESULT } = await import('./demoUserData');

    const state = getInitialPersonalColorState(null, [], true);

    expect(state.result?.seasonTop1Id).toBe('soft-summer');
    expect(SOFT_SUMMER_DEMO_RESULT.seasonTop1).toBe('소프트 서머');
    expect(state.history[0].result.seasonTop1Id).toBe('soft-summer');
  });

  it('기존 저장 결과와 이력이 있으면 데모 모드 여부와 무관하게 덮어쓰지 않는다', async () => {
    const imported = await import('./demoUserData');
    const existing: FinalResult = {
      ...imported.SOFT_SUMMER_DEMO_RESULT,
      seasonTop1Id: 'true-winter',
      seasonTop1: '트루 윈터',
    };
    const history = [{ id: 'pc-existing', measuredAt: '2026-07-03T00:00:00.000Z', result: existing }];
    const state = imported.getInitialPersonalColorState(existing, history, false);

    expect(state.result?.seasonTop1Id).toBe('true-winter');
    expect(state.history).toBe(history);
  });
});

describe('isDemoModeEnabled', () => {
  it('VITE_DEMO_MODE가 "true"가 아니면 false다', async () => {
    const { isDemoModeEnabled } = await import('./demoUserData');
    expect(isDemoModeEnabled()).toBe(false);
  });
});
