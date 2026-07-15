# ColorFit UI Full Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 v2 기능과 상태 흐름을 보존하면서 ColorFit V6 디자인을 홈, 퍼컬, 옷장, 옷 추가, 추천, 보관함, 데일리룩, 설정 전체에 적용한다.

**Architecture:** `App.tsx`와 기존 훅을 상태 소유자로 유지하고 화면 컴포넌트의 마크업과 `colorfit.css`의 화면별 연결 스타일을 교체한다. 저장 룩 폴더와 즐겨찾기만 기존 저장 계약에 추가하고, 퍼컬 비교·색상 탭·수정 시트는 컴포넌트 로컬 상태로 둔다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, lucide-react, localStorage 저장 어댑터.

## Global Constraints

- 실제 구현은 `v2/src`와 `v2/public`만 대상으로 하고 `V2_UI/**/01_current_code`는 수정하지 않는다.
- 새 라이브러리를 설치하지 않는다.
- 진단, 추천, 이미지 분석 계산식과 공개 함수 시그니처는 유지한다.
- 기본 화면은 차분하게, 퍼컬 3단계와 색상 분석 팝업만 리퀴드 글라스를 강조한다.
- 모바일 기준 폭은 390px이며 의도하지 않은 수평 스크롤을 허용하지 않는다.
- 새 소스 파일 첫 줄에는 역할을 설명하는 한국어 주석을 둔다.

---

### Task 1: UI 계약과 저장 폴더 계약을 테스트로 고정

**Files:**
- Create: `v2/src/app/colorfitUiIntegration.test.ts`
- Create: `v2/src/hooks/useSavedOutfits.folders.test.ts`
- Modify: `v2/src/wardrobeTypes.ts`
- Modify: `v2/src/wardrobeConstants.ts`
- Modify: `v2/src/services/appPersistence.ts`
- Modify: `v2/src/hooks/useSavedOutfits.ts`

**Interfaces:**
- Produces: `SavedLookFolder`, `DEFAULT_SAVED_LOOK_FOLDERS`, `normalizeSavedLookFolders()`, `moveSavedOutfitToFolder()`, `toggleSavedOutfitFavorite()`.
- Produces from `useSavedOutfits`: `savedLookFolders`, `createSavedLookFolder(name)`, `moveSavedOutfit(id, folderId)`, `toggleSavedOutfitFavorite(id)`.

- [ ] **Step 1: UI 계약 실패 테스트 작성**

`colorfitUiIntegration.test.ts`에서 실제 소스를 읽고 다음을 단언한다.

`expect(home).toContain('home-entry-grid')`
`expect(personal).toContain('result-liquid-layout')`
`expect(wardrobe).not.toContain('옷장 건강도')`
`expect(wardrobe).toContain('manual-edit-sheet')`
`expect(colorModal).toContain('color-insight-overlay')`
`expect(saved).toContain('folder-row')`
`expect(tryOn).toContain('daily-layout')`

- [ ] **Step 2: 테스트가 RED인지 확인**

Run: `npm test -- src/app/colorfitUiIntegration.test.ts`

Expected: 새 클래스와 제거 문구 계약이 현재 소스에서 실패한다.

- [ ] **Step 3: 폴더 도메인 테스트 작성**

`useSavedOutfits.folders.test.ts`에서 레거시 저장 룩의 기본 폴더 정규화, 새 폴더 이름 trim, 폴더 이동, 즐겨찾기 토글을 검증한다.

- [ ] **Step 4: 폴더 타입과 순수 함수 최소 구현**

`SavedOutfit`에 `folderId?: string`, `isFavorite?: boolean`를 추가하고 다음 타입을 정의한다.

`export interface SavedLookFolder { id: string; name: string; tint: string; createdAt: string; }`

저장 어댑터에 `loadFolders`, `saveFolders`를 추가하고 훅이 저장 키를 직접 참조하지 않게 한다.

- [ ] **Step 5: 타깃 테스트 통과 확인**

Run: `npm test -- src/hooks/useSavedOutfits.folders.test.ts`

Expected: 폴더 관련 테스트가 모두 PASS한다.

- [ ] **Step 6: 커밋**

`git add v2/src/app/colorfitUiIntegration.test.ts v2/src/hooks/useSavedOutfits.folders.test.ts v2/src/wardrobeTypes.ts v2/src/wardrobeConstants.ts v2/src/services/appPersistence.ts v2/src/hooks/useSavedOutfits.ts`

`git commit -m "feat: 룩 보관함 폴더 저장 계약 추가"`

### Task 2: 원본 진입 구조 홈과 퍼컬 3단계 이식

**Files:**
- Modify: `v2/src/App.tsx`
- Modify: `v2/src/features/home/HomeDashboard.tsx`
- Modify: `v2/src/components/PhotoAnalyzer.tsx`
- Modify: `v2/src/components/Questionnaire.tsx`
- Modify: `v2/src/features/personal/PersonalResult.tsx`
- Modify: `v2/src/colorfit.css`

**Interfaces:**
- Consumes: `SEASON_DISPLAY`, 기존 `FinalResult`, 기존 `PhotoAnalyzer.onAnalysisComplete`, 기존 `Questionnaire.onComplete`.
- Produces: `PersonalResult({ result, onRetry, onOpenWardrobe })`.

- [ ] **Step 1: 홈을 네 가지 핵심 진입 카드로 재구성**

`home-entry-grid` 안에 퍼컬 진단, 옷장 만들기, 옷 추가, 데일리룩 버튼을 두고 기존 콜백을 그대로 연결한다. 날씨, 옷장 현황, 최근 룩은 `home-support-grid`로 분리한다.

- [ ] **Step 2: 촬영 마크업을 실제 카메라 중심 구조로 교체**

기존 카메라 초기화와 분석 함수는 유지한다. 렌더 영역만 `personal-shell`, `flow-rail`, `camera-stage`, `camera-ui` 구조로 바꾸고 비디오, 얼굴 가이드, 흰 종이 가이드, 촬영 버튼, 오류 폴백을 연결한다.

- [ ] **Step 3: 설문을 ColorFit 질문 카드로 교체**

Tailwind 유틸리티 의존 마크업을 제거하고 `question-layout`, `question-card`, `question-options`, `option-card`를 사용한다. 선택 즉시 다음 문항으로 이동하는 기존 로직은 유지한다.

- [ ] **Step 4: 결과 화면 구현**

`SEASON_DISPLAY[result.seasonTop1Id]`를 초기 비교 시즌으로 사용한다. 24색 팔레트, 4축 위치, 관찰색, 12계절 비교, usage 3그룹을 렌더링하고 비교 버튼은 로컬 `previewSeasonId`만 변경한다.

- [ ] **Step 5: 타깃 UI 계약 통과 확인**

Run: `npm test -- src/app/colorfitUiIntegration.test.ts`

Expected: 홈과 퍼컬 관련 단언이 PASS한다.

- [ ] **Step 6: 커밋**

`git add v2/src/App.tsx v2/src/features/home/HomeDashboard.tsx v2/src/components/PhotoAnalyzer.tsx v2/src/components/Questionnaire.tsx v2/src/features/personal/PersonalResult.tsx v2/src/colorfit.css`

`git commit -m "feat: ColorFit 홈과 퍼컬 화면 전면 적용"`

### Task 3: 옷장, 옷 추가, 색상 분석 레이어 이식

**Files:**
- Modify: `v2/src/features/wardrobe/WardrobeSection.tsx`
- Modify: `v2/src/features/color/ColorInsightModal.tsx`
- Modify: `v2/src/features/color/ColorInsightModal.test.tsx`
- Modify: `v2/src/colorfit.css`

**Interfaces:**
- Consumes: `buildColorInsight({ hex, seasonId, sourceLabel })`.
- Extends: `ColorInsightModal` with optional `activeHex` and `onSelectHex(hex)`.

- [ ] **Step 1: 색상 팝업 테스트 확장**

대표·보조색 버튼, `color-insight-overlay`, `liquid-color-orb`, 기존 LCh 범례가 렌더링되는지 단언한다.

- [ ] **Step 2: 색상 팝업 V5 구조 적용**

현재 계산값을 그대로 사용하고 오브, 적합도 지표, LCh 스펙트럼, 팔레트, dominant 색 전환을 새 마크업으로 렌더링한다. 미래 구현 안내 문구는 사용자 화면에서 제거한다.

- [ ] **Step 3: 옷장 준비도 제거**

`wardrobe-health-panel`을 삭제하고 대표색 빈도 상위 4개와 카테고리 수를 계산해 `wardrobe-color-summary`와 `axis-list`로 보여준다. 버튼 문구 `AI 추천`은 `추천 받기`, `DB에서 담기`는 `카탈로그에서 추가`로 바꾼다.

- [ ] **Step 4: 옷 추가 분석 우선 흐름 구현**

초기 화면에는 이미지, 분석 상태, 카테고리·소재·패턴·계절 요약, dominant 색상, 저장 버튼을 보여준다. 상세 입력 폼은 `detailsOpen`이 true일 때 `manual-edit-sheet`에 렌더링한다.

- [ ] **Step 5: 모바일 수정 시트 스와이프 닫기 구현**

포인터 시작 Y를 ref에 저장하고 80px 이상 아래로 이동한 뒤 놓으면 `setDetailsOpen(false)`를 호출한다. 시트 transform은 드래그 중에만 inline style로 반영한다.

- [ ] **Step 6: 추출 색상 팝업 연결**

색상 블록을 누르면 해당 HEX를 manual color로 선택하고 같은 `ColorInsightModal`을 연다. 퍼컬 결과가 없으면 선택은 가능하지만 상세 분석 버튼은 비활성 안내를 보여준다.

- [ ] **Step 7: 타깃 테스트와 커밋**

Run: `npm test -- src/features/color/ColorInsightModal.test.tsx src/features/wardrobe/WardrobeSection.colorInsight.test.ts src/app/colorfitUiIntegration.test.ts`

Expected: 모두 PASS한다.

`git commit -m "feat: ColorFit 옷장과 분석 우선 옷 추가 적용"`

### Task 4: 추천 결과 정보 계층 재구성

**Files:**
- Modify: `v2/src/features/recommendation/RecommendationDashboard.tsx`
- Modify: `v2/src/colorfit.css`

**Interfaces:**
- Consumes: 기존 `OutfitRecommendation[]`, `onSave(outfit)`, 날씨와 옷장 선택 props.
- Produces: 첫 항목 `best-outfit`, 나머지 `compact-outfit` 카드.

- [ ] **Step 1: 조건 패널을 요약형으로 교체**

퍼컬, 날씨, 상황, 선택 옷장을 `criteria-grid`에 표시하고 `조건 변경` 버튼으로 기존 옷장·날씨 선택 패널을 연다.

- [ ] **Step 2: 1순위 룩을 크게 렌더링**

첫 추천은 캔버스형 이미지 보드, 총점, 4축 점수, 설명 bullet, 저장 버튼을 보여준다. 내부 `추천 점수 진단` 평균 패널은 제거한다.

- [ ] **Step 3: 나머지 추천을 압축 카드로 렌더링**

2순위 이후는 이미지 2~3장, 점수, 제목, 핵심 근거 한 줄, 저장 버튼만 보여준다.

- [ ] **Step 4: 빈 상태와 모바일 확인**

추천 전에는 조건과 명확한 추천 버튼을 유지하고, 결과 없음은 기존 `EmptyState`를 사용한다.

- [ ] **Step 5: 타깃 테스트와 커밋**

Run: `npm test -- src/app/colorfitUiIntegration.test.ts`

Expected: 추천 구조 계약이 PASS한다.

`git commit -m "feat: ColorFit 추천 결과 화면 재구성"`

### Task 5: 룩 보관함 폴더 UI 연결

**Files:**
- Modify: `v2/src/App.tsx`
- Modify: `v2/src/features/saved-outfits/SavedOutfits.tsx`
- Modify: `v2/src/colorfit.css`

**Interfaces:**
- Consumes: Task 1의 폴더 배열과 생성·이동·즐겨찾기 콜백.
- Produces: `SavedOutfits`의 폴더 필터, 새 폴더 대화상자, 카드별 폴더 select와 즐겨찾기 버튼.

- [ ] **Step 1: App에서 새 훅 반환값 연결**

`SavedOutfits`에 `folders`, `onCreateFolder`, `onMoveToFolder`, `onToggleFavorite`를 전달한다.

- [ ] **Step 2: 보관함 헤더와 폴더 행 구현**

`vault-head`, `folder-row`, `folder-card`를 렌더링한다. 전체와 즐겨찾기는 가상 폴더, 나머지는 저장된 실제 폴더다.

- [ ] **Step 3: 저장 룩 카드 구현**

검색·정렬은 유지하고 폴더 필터를 추가한다. 카드에서 즐겨찾기, 폴더 이동, 편집, 삭제를 수행할 수 있게 한다.

- [ ] **Step 4: 타깃 테스트와 커밋**

Run: `npm test -- src/hooks/useSavedOutfits.folders.test.ts src/app/colorfitUiIntegration.test.ts`

Expected: 폴더 저장과 UI 계약이 PASS한다.

`git commit -m "feat: 룩 보관함 폴더 UI 연결"`

### Task 6: 데일리룩 모바일 편집과 설정 마감

**Files:**
- Modify: `v2/src/features/try-on/TryOn.tsx`
- Modify: `v2/src/App.tsx`
- Modify: `v2/src/colorfit.css`

**Interfaces:**
- Consumes: 기존 `DailyLookState`와 저장 콜백.
- Produces: `requestAnimationFrame` 기반 레이어 이동 스케줄러.

- [ ] **Step 1: 데일리룩 3열 구조 적용**

기존 기능을 `daily-layout`, `asset-panel`, `canvas-panel`, `layer-panel`에 배치한다. 모바일 DOM 순서는 캔버스, 자산, 레이어다.

- [ ] **Step 2: 드래그 상태 갱신 제한**

포인터 이동값을 ref에 저장하고 예약된 frame이 없을 때만 `requestAnimationFrame`을 등록한다. frame에서 `updateLayer` 또는 `updateTextLayer`를 한 번 호출하고 예약 ref를 비운다.

- [ ] **Step 3: 설정 화면 표면 정리**

현재 초기화 기능은 유지하고 `settings-layout`, `setting-list`, `setting-row` 구조로 바꾼다. 동작하지 않는 토글은 추가하지 않는다.

- [ ] **Step 4: 타깃 테스트와 커밋**

Run: `npm test -- src/app/colorfitUiIntegration.test.ts`

Expected: 데일리룩 구조 계약이 PASS한다.

`git commit -m "feat: ColorFit 데일리룩 모바일 편집 적용"`

### Task 7: 전체 검증과 문서 마감

**Files:**
- Modify: `v2/checklist.md`
- Modify: `v2/context-notes.md`

- [ ] **Step 1: 타입 검사**

Run: `npm run lint`

Expected: TypeScript 오류 0건.

- [ ] **Step 2: 전체 테스트**

Run: `npm test`

Expected: 모든 Vitest 테스트 PASS.

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`

Expected: Vite/PWA 빌드 성공. 기존 대형 청크 경고는 허용한다.

- [ ] **Step 4: 브라우저 데스크톱 검증**

`http://localhost:3100`에서 홈의 네 진입 버튼, 퍼컬 3단계, 옷장, 옷 추가 시트, 추천, 보관함 폴더, 데일리룩 편집을 순회한다. 콘솔 error 0건과 비어 있지 않은 화면을 확인한다.

- [ ] **Step 5: 브라우저 390px 검증**

수평 오버플로가 없고, 퍼컬 촬영 무대, 옷 추가 하단 시트, 폴더 가로 목록, 데일리룩 캔버스와 하단 도구가 겹치지 않는지 확인한다.

- [ ] **Step 6: 문서 체크**

완료 항목을 체크하고 실제 테스트 숫자, 빌드 결과, 브라우저 검증 결과를 `context-notes.md`에 기록한다.

- [ ] **Step 7: 최종 커밋**

`git add`는 이번 작업에서 수정한 `v2` 파일만 지정한다.

`git commit -m "feat: ColorFit UI 전면 이식 완료"`
