/*
 * main.tsx
 *
 * React 앱의 브라우저 진입점입니다.
 * index.html의 #root DOM 노드에 App 컴포넌트를 마운트하고, 전역 CSS를 로드합니다.
 *
 * 실제 도메인 흐름은 App.tsx와 services/components 하위 파일에 있으며,
 * 이 파일은 Vite 번들에서 가장 먼저 실행되는 부트스트랩 역할만 담당합니다.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './colorfit.css';

// 설치형(PWA) 지원 — 새 배포가 있으면 다음 방문에서 자동 갱신되는 서비스 워커를 등록한다.
registerSW({immediate: true});

// 진단·옷장 데이터가 전부 기기 저장소(localStorage/IndexedDB)에 있으므로 저장소 회수 제외를 요청한다.
void navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
