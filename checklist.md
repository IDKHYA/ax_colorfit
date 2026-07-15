# v2 체크리스트

## 2026-07-02

- [x] v1 리버스 FRD와 설계자 관점 문서를 읽고 v2 재구축 방향을 확인했다.
- [x] v2는 기존 코드를 직접 고치는 작업이 아니라 새 폴더에서 크게 재코딩하는 작업으로 확정했다.
- [x] v1의 퍼스널컬러 팔레트, 타입, 의류 스키마, 추천 엔진 상수를 1차 확인했다.
- [x] v2 작업 기준 문서 폴더를 만들었다.
- [x] 로직 핵심 정보 인벤토리 문서를 만들었다.
- [x] v2 스키마 계약 초안을 만들었다.
- [x] v2 앱 스캐폴드를 생성한다.
- [x] v2 추천 엔진 테스트를 먼저 작성한다.
- [x] v2 카탈로그 프리셋 샘플 데이터를 만든다.
- [x] 겹치지 않는 추천 3개 검증 스크립트를 만든다.
- [x] 골든 패스 최소 UI를 연결한다.
- [x] v2 테스트를 실행했다. `npm test` 통과.
- [x] v2 프로덕션 빌드를 실행했다. `npm run build` 통과.
- [x] v2 개발 서버를 실행했다. `http://localhost:3100/`.
- [x] 브라우저에서 데스크톱 렌더링, 이미지 로드, 날씨 오버라이드, 추천 저장 상태를 확인했다.
- [x] 모바일 폭에서 수평 오버플로가 없음을 확인했다.

### 원본 UI 계승 전환

- [x] 첫 v2 대시보드는 최종 UI가 아니라 추천 엔진 smoke prototype이라는 결정을 기록한다.
- [x] v1 원본 화면 흐름을 v2 앱 진입점으로 이식한다.
- [x] prototype 대시보드를 `v2/src/prototype` 아래로 분리한다.
- [x] v2 TypeScript/Vite 설정에 원본 UI의 `@/*` alias와 JSON 카탈로그 로딩 기준을 맞춘다.
- [x] v2 안에 공용 UI 컴포넌트와 원본 화면 컴포넌트를 복사한다.
- [x] 카탈로그 이미지 원본을 `v2/catalog/assets`와 `v2/public/catalog` 기준으로 정리한다.
- [x] 카탈로그 JSON/TS 메타데이터를 `v2/catalog/metadata`와 `v2/src/data` 기준으로 정리한다.
- [x] 카탈로그 구조 검증 테스트를 추가한다.
- [x] v2 테스트를 실행한다. `npm test` 통과.
- [x] v2 빌드를 실행한다. `npm run build` 통과.
- [x] 빌드 산출물 정적 서버로 브라우저 검증을 실행한다. 원본 홈, 퍼컬 측정 화면, 콘솔 오류 0건, 모바일 수평 오버플로 없음.

## 계속 갱신할 규칙

- 완료한 작업은 같은 날짜 아래에서 체크한다.
- 새 의사결정은 `context-notes.md`에 이유와 함께 남긴다.
- 코드 변경이 들어가면 테스트 또는 빌드를 실행한 뒤 완료로 표시한다.

## 2026-07-03

### 도메인 개념 계약 재정의

- [x] v2 어댑터 구현 전에 퍼컬 시즌, 착용 계절, 날씨 밴드, WarmthLevel, HEX, 색상이론 개념을 다시 고정하기로 결정했다.
- [x] `v2_md/도메인개념_색상계약_v2.md`에 개념 정의와 스키마 계약을 작성한다.
- [x] `v2_md/도메인개념_시각화.html`에 퍼컬별 HEX 팔레트와 색상이론·스키마 시각화를 작성한다.
- [x] 문서와 HTML이 v2 어댑터 구현 기준으로 읽히는지 자체 점검한다.

### 도메인 개념 고도화 — 계산 모델 설계

- [x] 현재 `v2/src/domain/recommendationEngine.ts`를 실측해 계약과의 격차표를 만들었다 (RGB 거리, Top1만, 계단식 날씨 점수 등 6개 축).
- [x] `v2_md/도메인개념_고도화_v2.md`에 계산 모델 설계서를 작성한다 — 스펙트럼 영역 모델, 퍼컬 적합도 함수, 조화 성분 분해, 날씨 연속 감점, WarmthLevel 신호표, N조합 완화 사다리.
- [x] 구현 게이트 G1~G13을 테스트 요구사항으로 정의한다.

### 계산 모델 구현 (G1~G13)

- [x] `v2/src/domain/colorMath.ts` — HEX→LAB/LCh, CIEDE2000(Sharma 표준 쌍 검증), 사다리꼴 멤버십. (G1 기반, G2 전제)
- [x] `v2/src/domain/seasonSpectrum.ts` — 스와치 감사(중복 병합·이상치 표시), LCh 영역 산출, 멤버십, Delta E→점수 매핑, 중립 규칙, 회피 감점. (G2, G4, G5, G6)
- [x] `v2/src/domain/warmthDerivation.ts` — 종류→소재→구조→SeasonTag 폴백 우선순위 파생, 색·노출 입력 자체가 없음. (G11)
- [x] `v2/src/domain/recommendationEngine.ts` 교체 — dominant 가중 + Top2 혼합(G3), 조화 성분 50/30/20 + 시즌 대비 선호(G8) + 패턴 충돌(G7), 날씨 연속 감점 + 아우터 규칙(G9, G10), 완화 사다리 + hue 버킷 다양성(G12). 아이템·쌍 점수는 조합 루프 밖에서 선계산.
- [x] 프리셋에 아우터 2벌(울 코트 heavy, 트렌치 warm) 추가, 데님 하의에 `isDenim` 부여.
- [x] 성립 보장 검증을 12시즌 × 8밴드 전수로 확장. (G13)
- [x] `npm test` 통과 — 11개 파일 91개 테스트 (기존 52 → 91).
- [x] `npm run build` 통과 (기존 chunk size 경고만 유지).
- [x] 문서 §5.1 밴드 목표값을 구현 튜닝값(warm 0.75, mild 1.75, cool 2.4, chilly 2.75)으로 동기화.
- [ ] `도메인개념_시각화.html`에 시즌 영역(§2.4) 오버레이를 추가해 12시즌 영역 산출값을 눈으로 점검한다.
- [x] 시즌별 회피색 목록(`SEASON_AVOID_HEXES`) 채우기 — v1 `SEASON_DETAILS.worstColors`(시즌당 5개)를 승계.
- [x] 승계 회피색 11개가 자기 팔레트와 Delta E 15 이내임을 실측으로 발견 → 감점에 결정 경계(팔레트가 더 가까우면 감점 억제) 도입, 팔레트 스와치 무감점 보장을 테스트로 고정.
- [x] `npm test` 95개 통과, `npm run build` 통과.

### 색상 HTML, 여름뮤트 데모 데이터, 옷장 영속성 보강

- [x] 현재 색상 HTML과 `colorMath`, `seasonSpectrum`, `storage`, `useWardrobes`, `usePersonalColor` 흐름을 확인한다.
- [x] 정적 HTML이 Lab/LCh/CIEDE2000과 시즌 영역 내용을 포함하는 실패 테스트를 먼저 작성한다.
- [x] v2 카탈로그 ID가 `catalog-`로 시작하지 않아도 복원되는 실패 테스트를 먼저 작성한다.
- [x] 저장값이 없을 때 여름뮤트 데모 퍼컬 결과가 제공되는 실패 테스트를 먼저 작성한다.
- [x] `v2_md/도메인개념_시각화.html`을 새 스펙트럼과 계산 모델 설명이 반영된 HTML로 갱신한다.
- [x] `useWardrobes` 복원 필터를 현재 카탈로그 ID 기준으로 수정한다.
- [x] 여름뮤트 데모 퍼컬 결과와 이력 초기값을 추가한다.
- [x] `npm test`를 실행한다. 14개 파일 101개 테스트 통과.
- [x] `npm run build`를 실행한다. 빌드 통과, 기존 큰 청크 경고만 유지.
### 저장 계층 DB 전환 준비

- [x] `v2/plan.md`, `v2/checklist.md`, `v2/context-notes.md`에 저장 계층 정리 범위를 기록한다.
- [x] 저장소 어댑터 테스트를 먼저 작성하고 현재 코드에서 실패하는 것을 확인한다.
- [x] `services/storage.ts`에 삭제 유틸을 추가해 직접 `localStorage.removeItem` 호출을 줄인다.
- [x] `services/appPersistence.ts`에 퍼컬, 옷장, 저장 코디용 localStorage 어댑터를 만든다.
- [x] `usePersonalColor`, `useWardrobes`, `useSavedOutfits`가 저장 키를 직접 알지 않게 교체한다.
- [x] 저장 코디 데일리룩 업데이트의 선택 인자 처리 회귀 위험을 테스트로 확인한다.
- [x] `npm test`를 실행한다.
- [x] `npm run build`를 실행한다.

### 옷장 색상 분석 팝업 레이어

- [x] `v2/plan.md`, `v2/checklist.md`, `v2/context-notes.md`에 팝업 레이어 범위와 재사용 방향을 기록한다.
- [x] 색상 분석 서비스 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 색상 분석 팝업 렌더링 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 옷장 상세의 색상 정보 클릭 계약 테스트를 먼저 작성하고 실패를 확인한다.
- [x] G1~G13 계산 모델의 `colorMath`, `seasonSpectrum`을 재사용하는 색상 분석 서비스를 만든다.
- [x] `ColorInsightModal` 팝업 레이어 컴포넌트를 만든다.
- [x] 옷장 상세 의류 카드의 색상 정보 버튼에서 팝업 레이어를 열게 연결한다.
- [x] 팝업 레이어 CSS를 현재 UI 스타일에 맞춰 추가한다.
- [x] 관련 테스트를 통과시킨다.
- [x] `npm test`를 실행한다.
- [x] `npm run build`를 실행한다.

### 색상 분석 팝업 다듬기 — 스펙트럼 가독성

- [x] 팝업 적합도 점수 바닥을 엔진과 같은 15로 통일한다.
- [x] 퍼컬 미측정 상태에서 색상 정보 버튼을 비활성화하고 "퍼컬 측정 후 이용 가능" 안내를 붙인다.
- [x] 스펙트럼 배경을 고정 파스텔에서 현재 색 hue 기반 L×C 평면(위 밝음, 오른쪽 고채도)으로 교체한다. 무채색은 회색 램프.
- [x] 최근접 팔레트 마커를 우하단 고정에서 실제 LCh 좌표 위치로 옮긴다.
- [x] 시즌 영역 경계를 흰 점선 + 어두운 외곽선 이중 윤곽으로 강화하고 "시즌 영역" 라벨을 붙인다.
- [x] 25% 간격 격자, 고명도/저명도 세로축 라벨, 범례(현재 색·최근접 팔레트·시즌 영역)를 추가한다.
- [x] `npm test` 114개 통과, `npm run build` 통과, 브라우저에서 팝업 렌더링을 스크린샷으로 확인.

### URL·인터넷 이미지 수집 — 구현 전 목업

- [x] `v2_md/url수집_목업.html`에 4개 상태 화면(주소 입력 / 분석 중 / 초안 확인 / 실패 폴백) 목업을 작성한다.
- [x] 화면마다 구현 메모(엔드포인트, 파싱 3단 폴백, ColorInsightModal 재사용, 단일 병합 경로)를 붙인다.
- [x] 브라우저에서 탭 전환과 4개 화면 렌더링을 확인한다.
- [x] 목업 검토 후 1단계(서버 프록시 + SSRF 가드)부터 구현 착수.

### URL 수집 1단계 — FastAPI 프록시와 SSRF 가드

- [x] `v2/plan.md`, `v2/checklist.md`, `v2/context-notes.md`에 서버 프록시 1단계 범위와 검증 기준을 기록한다.
- [x] 실네트워크 없는 URL 수집 서버 테스트를 먼저 작성하고 실패를 확인한다.
- [x] `v2/server`에 FastAPI 앱과 URL 수집 서비스 파일을 만든다.
- [x] http/https 스킴만 허용한다.
- [x] localhost, 사설 IP, link-local, reserved IP를 차단한다.
- [x] 리다이렉트마다 URL 검증을 반복하고 최대 횟수를 제한한다.
- [x] 응답 크기 제한을 구현한다.
- [x] Content-Type 기준으로 이미지와 HTML을 분기한다.
- [x] `POST /api/ingest/url` 라우트 계약을 고정한다.
- [x] `python -m unittest` 서버 테스트를 통과시킨다.
- [x] `npm test`를 실행한다.
- [x] `npm run build`를 실행한다.

### URL 입력 UI 1차 연결

- [x] `v2/plan.md`, `v2/checklist.md`, `v2/context-notes.md`에 UI 연결 범위와 보류 범위를 기록한다.
- [x] `requestUrlIngest` 프론트 API 호출 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 수동 등록 화면의 URL 입력 계약 테스트를 먼저 작성하고 실패를 확인한다.
- [x] `clothingImageApi.ts`에 `/api/ingest/url` 호출 함수를 추가한다.
- [x] `useManualClothing`에 URL 입력 상태와 분석 요청 액션을 추가한다.
- [x] `App.tsx`에서 URL 입력 상태와 액션을 `WardrobeSection`으로 전달한다.
- [x] `ManualAdd`에 `URL로 가져오기` 탭, 주소 입력창, 분석 버튼, 결과/오류 안내를 추가한다.
- [x] URL 입력 UI CSS를 현재 수동 등록 화면 톤에 맞춰 추가한다.
- [x] Vite `/api` 프록시와 `dev:api` 스크립트, `/api/health` 라우트를 추가한다.
- [x] 관련 테스트를 통과시킨다.
- [x] `npm test`를 실행한다.
- [x] `npm run build`를 실행한다.

### URL 상품 페이지 대표 이미지 파싱

- [x] `v2/plan.md`, `v2/checklist.md`, `v2/context-notes.md`에 대표 이미지 파싱 단계의 범위와 기준을 기록한다.
- [x] 서버 테스트를 먼저 추가해 `og:image`, JSON-LD Product, 이미지 휴리스틱, 실패 폴백이 현재 실패하는 것을 확인한다.
- [x] URL 수집 서버가 HTML 응답에서 대표 이미지 URL, 상품명, 파싱 전략을 반환하게 구현한다.
- [x] 프론트 API 타입과 URL 결과 UI가 대표 이미지 찾기 완료 상태를 표시하게 구현한다.
- [x] 관련 타깃 테스트를 통과시킨다.
- [x] `npm test`를 실행한다.
- [x] `npm run build`를 실행한다.
- [x] 관련 파일만 스테이징하고 의미 단위 커밋을 만든다.

### URL 대표 이미지 초안 연결

- [x] 추적 문서 3종에 이번 단계 범위를 기록한다.
- [x] 서버 테스트를 먼저 추가해 이미지 프록시가 RED인 것을 확인한다.
- [x] `POST /api/ingest/image`를 SSRF 가드 재사용으로 구현한다.
- [x] 프론트가 프록시 이미지를 받아 기존 자동 분석 경로로 초안을 만든다.
- [x] 저장 아이템에 sourceType 'url'과 sourceRef를 기록한다.
- [x] v2 API 서버에 v1 누끼·정밀 추출 라우트를 브리지로 합쳐 자동 분석 404를 해소한다.
- [x] 관련 타깃 테스트, `npm test`, `npm run build`를 통과시킨다.
- [x] 실제 URL로 초안 생성부터 저장까지 브라우저에서 확인한다.
- [x] 의미 단위 커밋을 만든다.

### 등록 시 원본 사진 유지 + 색상 자동 조사 + 누끼는 선택권으로 전환

- [x] 자동 분석(`autoAnalyzeOnUpload`)이 imageUrl/cutoutImageUrl을 덮어쓰지 않도록 소스 계약 테스트를 먼저 추가한다(RED).
- [x] `autoAnalyzeOnUpload`에서 원본 사진 관련 필드 갱신을 제거하고 색상·분류만 반영한다.
- [x] URL 대표 이미지 초안 만들기가 성공하면 사진 업로드 탭으로 전환해 누끼 따기/정밀 누끼 선택지를 보여주는 테스트를 추가한다(RED).
- [x] `adoptUrlImage`가 성공 여부(boolean)를 반환하도록 바꾸고, 실패 시에는 URL 탭에 머물러 오류를 보여준다.
- [x] `npm run lint`, `npm test`, `npm run build`를 통과시킨다.
- [x] 무신사 URL로 원본 사진 유지·색상 자동 반영·누끼 선택 버튼 노출·실제 누끼 적용까지 브라우저에서 확인한다.
- [x] 의미 단위 커밋을 만든다.

### Vercel 배포 준비 — 정적 SPA + 수집 API 서버리스 이식

- [x] 루트 .gitignore를 추가하고 node_modules·dist·로그·플레이라이트 산출물을 git 추적에서 해제한다.
- [x] v2/api/index.py 서버리스 엔트리를 만들어 수집 라우트만 노출하고, ML 라우트는 503 한국어 안내로 대체한다.
- [x] v2/vercel.json(리라이트, 함수 excludeFiles)과 v2/requirements.txt를 작성한다.
- [x] 누끼·정밀 누끼 오류 메시지가 서버 detail 문구를 읽도록 프론트 파서를 보강한다.
- [x] PhotoAnalyzer 카메라 안내 문구의 localhost 전제를 HTTPS 기준으로 고친다.
- [x] 서버리스 엔트리 계약 테스트를 추가하고 서버 테스트, npm test, npm run build를 통과시킨다.
- [x] 의미 단위 커밋을 만든다.

### PWA 전환 — 설치형 앱 지원

- [x] vite-plugin-pwa를 도입하고 매니페스트(한국어 이름, standalone, 아이콘)를 정의한다.
- [x] 카탈로그 이미지 861장이 프리캐시에 들어가지 않도록 앱 셸만 프리캐시하고, 카탈로그·MediaPipe CDN·날씨 API는 런타임 캐시로 분리한다.
- [x] 앱 아이콘(192/512/maskable/apple-touch)을 생성해 public/icons에 넣는다.
- [x] index.html에 theme-color·apple 메타를 추가하고, 자동 업데이트 SW 등록과 storage.persist 요청을 main.tsx에 넣는다.
- [x] 빌드 산출물에서 sw.js 프리캐시 목록에 catalog가 없음을 확인하고, vite preview로 SW 등록·매니페스트를 실검증한다.
- [x] lint, npm test, npm run build를 통과시키고 의미 단위 커밋을 만든다.

### 2026-07-08 퍼컬 진단 백지 화면 복구
- [x] 3100번 v2 앱에서 `측정 시작` 클릭 후 백지 화면과 콘솔 오류를 재현한다.
- [x] v2와 상위 루트의 React 및 Base UI 의존성 해석 차이를 확인한다.
- [x] v2 UI 원시 컴포넌트가 Base UI를 쓰지 않도록 회귀 테스트를 먼저 추가하고 RED를 확인한다.
- [x] `Button`과 `Progress`를 v2 내부 네이티브 컴포넌트로 최소 변경한다.
- [x] 표적 테스트와 전체 `npm test`를 통과시킨다.
- [x] `npm run build`를 통과시킨다.
- [x] 브라우저에서 `측정 시작` 진입 화면과 콘솔 오류 부재를 확인한다.

### ColorFit UI 적용 1단계 — 디자인 토큰·공통 셸·홈·브랜딩

- [x] 프로토타입 CSS를 v2/src/colorfit.css로 도입(캐스케이드 순서 보존)하고 예시 얼굴 사진 URL을 제거한다.
- [x] Pretendard Variable을 로컬 번들하고 @font-face를 추가한다.
- [x] Tailwind import를 걷어낸다.
- [x] ColorFit 브랜딩으로 교체한다 — index.html 타이틀·아이콘, PWA manifest 이름·아이콘, 구 아이콘 파일 정리.
- [x] App 셸(사이드바·탑바·모바일 헤더·하단 네비)을 ColorFit 구조로 재작성하고 라우트→body 상태(chromatic-mode, data-route) 훅을 만든다.
- [x] 시즌 테마 CSS 변수(--season-1~4)를 퍼컬 결과에서 주입하는 훅을 만든다.
- [x] 홈 화면을 ColorFit 레이아웃으로 재작성하되 실데이터(날씨·옷장 통계·최근 룩)를 바인딩한다.
- [x] npm run lint, npm test, npm run build 통과 + 프리뷰 스크린샷(데스크톱/모바일) 확인.
- [x] 의미 단위 커밋.


### ColorFit UI 전면 이식 — 승인 V6와 실제 v2 기능 통합

- [x] V6 원본, 1단계 커밋, 원본 홈, 현재 화면 컴포넌트의 구조 차이를 조사한다.
- [x] 구현 설계와 변경 경계를 `plan.md`, `context-notes.md`, 설계 문서에 기록한다.
- [x] 원본 핵심 진입 동선을 유지하는 홈으로 다시 구성한다.
- [x] 퍼컬 촬영·설문·결과를 크로마틱 리퀴드 글라스 구조로 이식한다.
- [x] 옷장 준비도 UI를 제거하고 실제 색상·카테고리 정보 중심으로 바꾼다.
- [x] 옷 추가를 분석 우선 요약과 정보 수정 시트로 바꾸고 색상 팝업을 연결한다.
- [x] 추천 화면의 조건, 1순위 룩, 보조 룩, 저장 행동 계층을 재구성한다.
- [x] 룩 보관함에 영속 폴더·즐겨찾기 분류와 보관함 UI를 적용한다.
- [x] 데일리룩 편집 화면을 PC 3열·모바일 캔버스 우선으로 정리하고 드래그 업데이트를 최적화한다.
- [x] 설정 화면을 공통 ColorFit 표면과 버튼 규칙에 맞춘다.
- [x] UI 계약 테스트와 저장 폴더 테스트를 통과시킨다.
- [x] `npm run lint`, `npm test`, `npm run build`를 통과시킨다. 최종 모바일 마감 뒤 빌드 재실행은 사용 한도 때문에 별도 미확인이다.
- [x] 데스크톱과 390px 모바일 브라우저에서 전체 화면 흐름과 콘솔을 확인한다.
- [ ] 관련 파일만 스테이징하고 의미 단위 커밋을 만든다.


### 2026-07-11 ColorFit V5 Exact 통합

- [x] V5 Exact React JSX, CSS, 테스트, 구현 계획을 조사했다.
- [x] 시각 기준과 기능 기준의 우선순위를 설계 문서에 고정했다.
- [x] 홈을 V5 Exact 구조로 실제 데이터에 연결한다.
- [x] 옷장 준비도 파생값과 전달 props를 제거한다.
- [x] 폴더 이름 변경과 삭제 로직을 테스트 우선으로 추가한다.
- [x] 보관함 UI에 폴더 관리 동작을 연결한다.
- [x] 나머지 화면을 V5 Exact 클래스와 대조 점검한다.
- [x] 데일리룩 편집기의 v2 로직과 폴더 저장 흐름을 검증한다.
- [x] 타입 검사와 전체 테스트를 최종 변경 후 통과하고, 통합 1차 상태의 빌드를 통과한다.
- [x] 데스크톱과 390px 모바일 브라우저 검증을 완료한다.
- [ ] 관련 파일만 의미 단위로 커밋한다.


### 2026-07-11 남은 검증

- [ ] 마지막 모바일 마감 뒤 `npm run build`를 재실행한다. 현재 실행 승인 사용 한도로 차단됐다.
- [ ] 관련 파일만 의미 단위로 커밋한다.


### 2026-07-11 데일리룩 편집 고도화

- [x] DailyLookState에 background 필드를 추가하고 buildDailyLookState에서 보존·기본값을 지정한다.
- [x] 편집 패널에 배경색 프리셋 스와치와 커스텀 color 입력을 추가한다.
- [x] 배경색을 화면 캔버스 인라인 style과 renderConfirmedImage fillStyle 양쪽에 반영한다.
- [x] 선택된 옷 레이어에 캔버스 위 크기·회전 핸들을 포인터 이벤트로 추가한다.
- [x] removeLayer로 선택 레이어를 삭제하고 draftItemIds와 상태 저장을 갱신한다.
- [x] npm run lint와 npm test를 통과한다.
