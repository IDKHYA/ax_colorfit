// 개발 서버가 FastAPI API 경로를 같은 origin처럼 전달하는지 설정 계약을 검증합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('API development proxy config', () => {
  it('Vite 개발 서버가 /api 요청을 FastAPI 서버로 프록시한다', () => {
    const source = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(source).toContain('proxy');
    expect(source).toContain("'/api'");
    expect(source).toContain('http://127.0.0.1:8001');
  });

  it('FastAPI 서버를 실행하는 dev:api 스크립트를 제공한다', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['dev:api']).toContain('uvicorn server.app:app');
    expect(pkg.scripts['dev:api']).toContain('--port 8001');
  });
});
