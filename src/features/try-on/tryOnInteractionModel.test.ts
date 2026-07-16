// 데일리룩 편집기 인터랙션 개편(핀치 제스처, 플로팅 미니 툴바, 입력 방식별 핸들 노출)이 실제로 반영됐는지
// 구조적으로 검증합니다. 정확한 픽셀 값이나 문구가 아니라 메커니즘의 존재/부재만 확인해 리팩터에 견고하게 둡니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/features/try-on/TryOn.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/colorfit.css'), 'utf8');

describe('데일리룩 인터랙션 개편', () => {
  it('레이어 편집 사이드/드로어 패널이 제거되었다', () => {
    expect(source).not.toContain('layer-panel');
    expect(source).not.toContain('mobileDrawer');
  });

  it('선택한 옷/텍스트 레이어에 2포인터 핀치 제스처 상태 추적이 있다', () => {
    expect(source).toContain('pointers.size');
    expect(source).toContain('Map<number');
    expect(source).toContain('startLayerGesture');
    expect(source).toContain('startTextGesture');
  });

  it('텍스트 레이어도 회전 핸들을 지원한다(예전에는 슬라이더로만 가능했다)', () => {
    expect(source).toContain('startTextRotate');
    expect(source).toContain('dailylook-text-rotate');
  });

  it('플로팅 미니 툴바가 캔버스 위 오버레이에 존재한다', () => {
    expect(source).toContain('dailylook-stage-overlay');
    expect(source).toContain('dailylook-mini-toolbar');
  });

  it('모바일 자산 드로어 진입점이 2버튼 바가 아니라 FAB 하나다', () => {
    expect(source).not.toContain('daily-mobile-bar');
    expect(source).toContain('dailylook-asset-fab');
  });

  it('배경색 선택이 헤더의 트리거+팝오버로 이동했다', () => {
    expect(source).toContain('dailylook-bg-trigger');
    expect(source).toContain('bgPopoverOpen');
  });

  it('데스크톱 조작 핸들은 정밀 포인터(마우스)에서만 노출된다', () => {
    expect(css).toContain('(hover: hover) and (pointer: fine)');
  });
});
