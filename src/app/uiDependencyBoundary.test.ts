// v2 UI 원시 컴포넌트가 상위 루트 의존성에 묶이지 않도록 확인하는 테스트입니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const activePersonalUiPrimitives = [
  'components/ui/button.tsx',
  'components/ui/progress.tsx',
];

describe('v2 UI dependency boundary', () => {
  it('퍼컬 진단 화면의 UI 원시 컴포넌트는 Base UI를 직접 import하지 않는다', () => {
    for (const filePath of activePersonalUiPrimitives) {
      const source = readFileSync(join(root, filePath), 'utf8');

      expect(source, `${filePath} should not import Base UI across workspace roots`).not.toContain('@base-ui/react');
    }
  });
});
