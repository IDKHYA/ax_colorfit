# v2 컨텍스트 노트

## 2026-07-02

### 재구축 범위

이번 작업은 v1 리팩터링이 아니라 `v2/` 폴더 안에서 새 제품처럼 다시 만드는 작업이다. v1은 검증된 로직과 UI 참고용으로만 읽고, 꼬인 데이터 파이프라인과 의류 인식 경로는 그대로 가져오지 않는다.

### 가장 중요한 순서

먼저 의류 스키마와 퍼스널컬러 HEX 기준, 추천 점수 축 같은 로직 계약을 문서화한다. v1에서 문제가 커진 이유가 "추천이 소비할 데이터 계약을 고정하기 전에 인식부터 만든 것"이기 때문이다.

### 골든 패스

초기 MVP는 사진 등록 없이 카탈로그 기반으로 성립해야 한다. 사용자가 퍼컬 결과를 확인하고, 프리셋 옷장을 선택하고, 겹치지 않는 추천 3개를 받고, 데일리룩으로 저장하고, 이미지를 내보내는 흐름이 1차 기준이다.

### 계절 용어 분리

퍼스널컬러 12계절은 `SeasonId`로 유지한다. 옷이 언제 입기 좋은지는 계절 직접 분류가 아니라 `WarmthLevel`과 날씨 밴드 매핑으로 표현한다. v1의 `SeasonTag`는 v2에서 바로 승계하지 않고 의미를 재정의한다.

### 자동 인식의 위치

자동 인식은 최종 판단자가 아니라 초안 작성기다. 사용자 수정값이 최종 권한이며, 저장 직전 병합 경로는 하나만 둔다. 이는 v1의 사용자 수정 무시, 이전 예측값 잔존, 재질 모순 문제를 구조적으로 막기 위한 결정이다.

### 첫 구현 단위

첫 구현은 서버나 사진 인식이 아니라 순수 추천 코어와 프리셋 골든 패스로 시작했다. `buildDistinctOutfitRecommendations`는 의류 배열, 퍼컬 결과, 수동 날씨 입력을 받아 겹치지 않는 추천 3개를 만든다. 테스트는 추천 3개 성립, 4축 점수와 한국어 근거, 의류 부족 시 이슈 반환을 검증한다.

### 기본 프리셋

`defaultWardrobePresetItems`는 상의 3개, 하의 3개, 신발 3개로 구성했다. 이 조합은 기본 날씨 18도와 트루 서머 시연 결과에서 겹치지 않는 추천 3개가 성립하도록 사람이 큐레이션한 데이터다. v1 카탈로그 이미지 9장을 `v2/public/catalog/`로 복사해 첫 화면에서 실제 의류 이미지가 보이게 했다.

### 타입 패키지 임시 처리

현재 루트 의존성에는 `@types/react`, `@types/react-dom`이 없어 v2 빌드를 위해 `src/react-shim.d.ts`에 최소 React 타입 선언을 두었다. 의존성 정리 단계에서 타입 패키지를 설치할 수 있으면 이 shim은 제거 대상이다.

### 검증 결과

`npm test`와 `npm run build`가 통과했다. Vite 개발 서버는 샌드박스에서 상위 디렉터리 읽기 제한으로 한 번 실패했지만, 동일 명령을 승인 실행하자 `http://localhost:3100/`에서 정상 실행됐다. 브라우저 검증에서 추천 카드 3개, 옷장 아이템 9개, 이미지 로드, 27도 날씨 오버라이드, 저장 후 `PNG 내보내기 준비` 상태를 확인했다. 모바일 390px 폭에서도 수평 오버플로가 없었다.

### 원본 UI 계승으로 방향 정정

사용자 피드백에 따라 첫 v2 대시보드는 최종 화면이 아니라 추천 엔진과 프리셋 데이터 검증용 smoke prototype으로 격하한다. v2의 실제 앱 진입점은 v1 원본 웹 구성과 UI 흐름을 계승해야 한다. 홈, 퍼스널컬러 사진 측정, 설문, 결과 확인, 옷장, 카탈로그 선택, 직접 옷 추가, 추천, 기준 옷 추천, 저장 코디, 데일리룩 편집 흐름이 v2 안에 함께 있어야 한다.

UI는 원본 구성과 룩앤필을 유지한다. 다만 로직은 v1을 무비판적으로 복붙하지 않는다. 퍼스널컬러 진단 엔진, 추천 엔진의 검증된 점수 설계와 테스트, 이미지 저장 계층처럼 건강한 자산은 이식한다. 의류 인식 병합, 착용 계절 직접 예측, 사용자 수정값 무시가 발생하던 경로는 v2 스키마와 단일 확정 파이프라인으로 다시 묶는다.

카탈로그는 v2 시연의 주연 데이터다. 루트 `public/catalog`, `src/data/trainingCatalog.ts`, `src/data/trainingCatalog.json`, `src/data/outerCatalog.ts`, 관련 생성·검증 스크립트가 분산되어 있으므로 v2 안에 원본 이미지, 정규화 메타데이터, 매니페스트, 검증 테스트를 함께 둔다. 기존 루트 원본은 건드리지 않고 v2 기준 복사본과 계약을 만든다.

### 원본 UI 이식 결과

v1 원본 `src`와 `components/ui`, `lib`를 v2 안으로 복사해 `v2/src/App.tsx`가 원본 UI 흐름을 진입점으로 사용하게 했다. 기존 v2 대시보드는 `v2/src/prototype/PrototypeDashboard.tsx`로 옮겨 smoke prototype으로만 보존했다. `v2/vite.config.ts`와 `v2/tsconfig.json`에는 원본 UI의 `@/*` alias를 v2 루트 기준으로 해석하도록 추가했다.

카탈로그는 `v2/catalog/assets`와 `v2/public/catalog`에 PNG 860장을 복사했다. `v2/catalog/metadata`에는 `trainingCatalog.json`, `trainingCatalog.ts`, `outerCatalog.ts`, `catalog-manifest.json`을 두었다. 매니페스트 기준으로 training item은 860개, outer item은 30개다. 생성·검증 스크립트는 `v2/catalog/scripts`에 1차 복사했다.

새 테스트는 `v2/src/app/originalUiPort.test.ts`와 `v2/src/app/catalogStructure.test.ts`다. RED 단계에서 원본 UI 파일, prototype 위치, 카탈로그 경로, 매니페스트가 없어 실패하는 것을 확인했고, 이식 후 `npm test`가 8개 파일 52개 테스트 통과로 바뀌었다. `npm run build`도 통과했다. 빌드 과정에서 Vite chunk size 경고가 1건 있었고, 이는 MediaPipe 포함 원본 번들 크기에서 오는 최적화 후보로 남긴다.

브라우저 검증은 샌드박스 제한 때문에 Vite dev server 대신 `dist/` 빌드 산출물을 읽는 임시 정적 서버로 진행했다. `http://127.0.0.1:3101/`에서 원본 Fitly 홈 화면, 퍼스널컬러 측정 CTA, 사진 분석 모듈, 사진 선택 버튼을 확인했다. 콘솔 error 로그는 0건이었다. 모바일 390px 계열 viewport에서 홈 텍스트가 표시되고 수평 오버플로가 없음을 확인한 뒤 임시 서버 프로세스를 종료했다.

## 2026-07-03

### 어댑터 전 도메인 계약 재정의

v2 로직 어댑터를 만들기 전에 `v2_md`에 색상·계절·날씨·의류 스키마 개념을 더 명확히 정의하기로 했다. 이유는 기존 v1이 퍼스널컬러 시즌과 착용 계절을 모두 "계절"이라고 부르면서, UI 문구·데이터 생성·추천 필터·논문 설명이 서로 어긋났기 때문이다.

새 기준은 다음과 같다. 퍼스널컬러 시즌은 사람과 색의 관계를 설명하는 12계절 `PersonalSeasonId`다. 착용 계절은 데이터의 1차 필드가 아니며, 옷의 형태·두께·소재·커버리지에서 파생하는 `WarmthLevel`과 `WeatherBand` 매핑으로 대체한다. `SeasonTag`는 v1 호환 입력으로만 읽고, v2 저장·추천 판단의 진실값으로 믿지 않는다. HEX는 색 이름과 분리해 저장하며, 퍼컬 적합도는 CIELAB/Delta E 거리, 코디 조화는 HSL hue 각도와 명도·채도 균형으로 계산한다.

`v2_md/도메인개념_색상계약_v2.md`에는 어댑터 구현 전에 지켜야 할 도메인 계약을 고정했다. 핵심은 `PersonalSeasonId`, `WarmthLevel`, `WeatherBand`, `SeasonTag`, HEX, 소재, 패턴, 데님 여부를 서로 다른 축으로 분리하고, v1에서 넘어오는 계절 문자열은 신뢰값이 아니라 보조 힌트로만 쓰는 것이다.

`v2_md/도메인개념_시각화.html`은 같은 계약을 브라우저에서 볼 수 있는 정적 기준표로 만들었다. 12계절 팔레트, HEX 스펙트럼, 색상이론 조화 각도, 날씨 밴드와 보온 등급, 의류 스키마 필수 필드를 한 화면에서 검토할 수 있게 했다.

### 도메인 개념 고도화 — 계산 모델 설계서 작성

개념 계약(무엇을 섞지 않는가) 다음 단계로, 각 개념을 계산 규칙까지 파고든 `v2_md/도메인개념_고도화_v2.md`를 작성했다. 계기는 현재 v2 엔진 실측이다. `v2/src/domain/recommendationEngine.ts`는 골든 패스 성립을 증명한 smoke 수준이라 RGB 유클리드 거리, Top1 팔레트만, 회피색 없음, 96/78/48 계단식 날씨 점수로 되어 있고, 계약이 요구하는 Delta E 2000·Top2 혼합·조화 성분 분해와 격차가 크다. 이 격차표가 문서 §1이다.

핵심 설계 결정은 다음과 같다.

첫째, 퍼컬 스펙트럼을 점 목록에서 "점 + 영역"으로 재가공한다. 시즌당 24개 스와치는 정밀도를, 스와치에서 자동 산출한 LCh 3축 범위(사다리꼴 멤버십)는 커버리지를 담당하고, 둘은 `max(swatchScore, 0.92 × regionScore)`로 상한 결합한다. 스와치 사이 구멍의 색이 부당하게 감점되던 문제를 영역이 구제한다. 영역 산출 전에 스와치 감사(중복 병합, 이상치 표시)를 빌드 타임에 1회 수행한다.

둘째, 모든 축에서 하드컷 대신 바닥 있는 감점을 쓴다. 퍼컬 축 바닥 25점, 날씨 축 바닥 30점. 오분류 한 번으로 아이템이 영구 실종되던 v1 문제를 구조적으로 막는다.

셋째, 날씨 축을 순서 거리 기반 연속 점수(`100 - 22 × |warmthPos - bandTarget|`)로 바꾸고 아우터 규칙(freezing·cold 필수, warm 이상 비권장, 레이어링 +1단계)을 도입했다. 이 규칙의 파급으로 프리셋 성립 보장 검증이 "12시즌 × 8밴드 전부"로 확장되어야 하고, 추운 밴드용 아우터가 프리셋에 필요해졌다.

넷째, 조화 축은 계약의 50/30/20 성분 비중 위에 시즌 대비 선호 보정(contrast 축 값을 곱하는 연속 보정, 시즌별 분기 하드코딩 없음), 패턴 충돌 감점, 상의-하의 쌍 60% 가중 집계를 추가했다.

다섯째, N조합 부족 시 완화 사다리(신발 → 신발+아우터 → 하의 순으로 재사용 허용, 상의는 끝까지 금지)와 `reusedItemIds` 기록, 점수 3점 이내 동률에서 hue 버킷 다양성 타이브레이크를 정의했다.

문서의 모든 수치는 이론 기반 초기값이며 10월 사용자 평가로 보정하는 대상임을 문서 서두에 명시했다. 구현 인정 조건은 게이트 G1~G13 테스트로 정의했고, 구현 순서는 색 수학 기반 → 퍼컬 축 → 영역 → 조화 → 날씨 → 조합기 → 프리셋 재검증의 7단계로 제안했다.

### 계산 모델 구현 — 게이트 G1~G13 전부 통과

설계서의 7단계를 같은 날 전부 구현했다. 새 모듈은 `colorMath.ts`(HEX→LAB/LCh, CIEDE2000 — Sharma 2005 표준 검증 쌍 3개로 정확도 고정), `seasonSpectrum.ts`(스와치 감사, LCh 영역 산출과 사다리꼴 멤버십, Delta E→점수 구간 선형 매핑, 중립 규칙, 회피 감점), `warmthDerivation.ts`(신호 우선순위 파생)이고, `recommendationEngine.ts`는 내부를 전부 교체하되 `buildDistinctOutfitRecommendations` 공개 시그니처는 유지해 goldenPathModel과 PrototypeDashboard가 수정 없이 동작한다.

구현 중 설계에서 조정한 것이 세 가지 있다.

첫째, 날씨 밴드 목표값을 0.5 간격에서 비대칭 값(warm 0.75, mild 1.75, cool 2.4, chilly 2.75)으로 튜닝했다. 계약 §4.2의 ideal/보조 허용 표가 비대칭이라(예: mild의 ideal은 mid·light, acceptable은 warm) 대칭 목표값으로는 ideal과 acceptable이 동점이 되어 G9의 엄격한 순서가 깨지기 때문이다. 설계서 §5.1도 이 값으로 동기화했다.

둘째, 아이템 단위 퍼컬·안정성 점수와 쌍 단위 조화 점수를 조합 루프 밖에서 선계산하는 캐시를 넣었다. G13이 12시즌 × 8밴드 × 후보 수십 개를 전수 검증하는데, 캐시 없이는 Delta E 호출이 수백만 회가 되기 때문이다. 캐시 후 도메인 테스트 전체가 0.6초 안에 돈다.

셋째, G6(영역 구제)은 특정 색을 하드코딩하지 않고 12시즌 전체 스와치 쌍의 LAB 중간색을 탐색해 "최근접 거리 12 초과 + 멤버십 0.9 이상" 사례가 실존하고 그 사례 전부에서 상한 결합이 스와치 점수를 이기는지 확인하는 속성 테스트로 만들었다. 팔레트 데이터가 고정이므로 결정적이다.

프리셋에는 아우터 2벌(차콜 울 코트 heavy, 그레이 트렌치 warm — 카탈로그의 v2_outer 이미지 사용)을 추가했고 데님 하의에 `isDenim: true`를 부여했다. 이로써 freezing~cool 밴드에서도 아우터 포함 코디가 성립하고, G13 전수 검증(96조합)이 통과한다. `SEASON_AVOID_HEXES`는 비어 있는 상태로 두었다 — 회피색 목록은 큐레이션 데이터 작업이라 규칙만 먼저 구현하고 데이터는 후속 작업으로 남긴다.

검증 결과. `npm test` 11개 파일 91개 테스트 통과(기존 52개에서 39개 증가), `npm run build` 통과. 도메인 타입에는 `isDenim?: boolean` 하나만 추가했고 나머지 스키마는 변경 없다.

### 회피색 데이터 승계와 결정 경계 도입

`SEASON_AVOID_HEXES`를 채웠다. 새로 큐레이션하려다 v1 `seasonContent.ts`의 `SEASON_DETAILS.worstColors`(시즌당 5개, 총 60개)가 이미 존재하고 v1 결과 화면("피해야 하는 색상" 타일)과 v1 의류 적합도 감점에 실사용되던 데이터임을 확인해, 발명 대신 승계로 방향을 바꿨다. 결과 화면이 보여주는 회피색과 추천 엔진이 감점하는 회피색이 같은 데이터여야 사용자 설명이 일관되기 때문이다.

승계 과정에서 정합성 테스트가 실데이터 문제를 잡았다. 회피색 60개 중 11개가 자기 시즌 팔레트와 Delta E 15 이내였다 (최악은 다크 윈터 회피색 `#F9CCC9` 페일 핑크 — 팔레트 아이시 핑크와 9.7). 이대로면 팔레트 색이 만점과 감점을 동시에 받는 모순이 생긴다. v1 데이터를 수정하는 대신 감점 규칙에 결정 경계를 도입했다 — 회피색이 팔레트보다 가까울 때만 감점하고, 동률이면 팔레트 우선으로 감점하지 않는다. 이 규칙으로 팔레트 스와치 자신은 어떤 시즌에서도 감점 0임이 전수 테스트로 보장되고, v1 데이터는 손대지 않고 그대로 쓴다. 엔진은 이미 계산하던 팔레트 최근접 거리를 감점 함수에 전달하기만 하면 되어 추가 비용이 없다.

`avoidPenaltyForSeason`의 시그니처는 옵션 객체(`{ avoidHexes?, nearestPaletteDeltaE? }`)로 바꿨다. 설계서 §3.3에도 결정 경계 규칙과 데이터 출처를 반영했다. `npm test` 95개 통과, `npm run build` 통과.

### 색상 HTML과 저장 구조 보강 착수

사용자 요청은 세 갈래다. 첫째, 이미 만든 색상 HTML에 `HEX -> CIELAB -> LCh`, CIEDE2000, 색채 조화 각도, 시즌별 스펙트럼 영역을 풍성하게 반영한다. 둘째, 사진 촬영 없이 추천 흐름을 볼 수 있도록 가상의 여름뮤트 데이터를 저장한다. 셋째, 서버를 껐다 켰을 때 옷장 데이터가 사라지는 문제를 고친다.

현재 v2 앱은 별도 서버 DB를 쓰지 않는다. 퍼컬 결과, 퍼컬 이력, 옷장 목록, 의류 목록, 저장 코디는 브라우저 `localStorage`에 JSON으로 저장한다. 업로드 이미지처럼 큰 data URL은 `imageStore.ts`가 IndexedDB로 옮기고, `localStorage`에는 `idb:` 마커를 남기는 구조다. 따라서 사용자가 말한 초기화는 서버 재시작 자체가 아니라 앱 재마운트 후 브라우저 저장값을 복원하는 과정에서 발생한 현상으로 봐야 한다.

복원 버그의 직접 원인은 `useWardrobes.ts`의 `reconcileStoredClothing` 필터다. 저장된 카탈로그 의류 중 `catalogItemId`가 `catalog-`로 시작하는 항목만 보존하고 있는데, 현재 v2 카탈로그는 `upper_shirt_001`, `v2_outer_coat_001`처럼 다른 ID 체계를 쓴다. 그래서 사용자가 카탈로그에서 옷을 저장해도 재시작 후 복원 단계에서 버려진다. 수정 방향은 현재 카탈로그 맵에 존재하는 ID면 보존하고, 레거시 `catalog-` ID도 호환으로 유지하는 것이다.

여름뮤트 테스트 데이터는 `soft-summer`를 기준으로 만든다. 저장값이 없을 때만 기본값으로 쓰고, 사용자가 측정하거나 설정에서 다른 이력을 적용한 결과는 덮어쓰지 않는다.

### 색상 HTML과 저장 보강 구현 결과

정적 HTML을 새 기준본으로 교체했다. `v2_md/도메인개념_시각화.html`은 `HEX -> RGB -> CIELAB -> LCh` 계산 흐름, CIEDE2000과 Sharma 표준 언급, Delta E 점수 매핑, 시즌별 `lRange`, `cRange`, `chromaticHues` 영역, 새 `spectrum-track`, 샘플 색상 점수, 회피색 결정 경계, `localStorage` 저장 키 설명을 포함한다. HTML 내부 JS는 외부 의존성 없이 팔레트에서 Lab/LCh와 시즌 영역을 다시 계산한다.

가상 사용자 데이터는 `v2/src/services/demoUserData.ts`에 둔다. `SOFT_SUMMER_DEMO_RESULT`는 `soft-summer`를 Top1, `true-summer`를 Top2로 둔 촬영 생략용 결과다. `usePersonalColor`는 저장된 퍼컬 결과가 없을 때 이 값을 기본 결과와 이력으로 사용하고, 이미 저장된 결과가 있으면 덮어쓰지 않는다.

옷장 데이터 초기화 문제는 `useWardrobes.ts`의 복원 필터를 수정해 해결했다. `reconcileStoredClothing`은 더 이상 `catalogItemId`가 `catalog-`로 시작하는 항목만 남기지 않는다. 현재 카탈로그 맵에 같은 ID가 있으면 이미지와 메타데이터를 최신 카탈로그 기준으로 보정하고, 없으면 기존 저장값을 정규화해 보존한다. 이 방식은 v2 카탈로그 ID와 레거시 ID를 모두 데이터 유실 없이 처리한다.

검증 결과. 먼저 RED 단계에서 신규 테스트 6개가 실패했다. 구현 후 `npm test`는 14개 파일 101개 테스트가 모두 통과했다. `npm run build`도 통과했으며, 기존 Vite 큰 청크 경고만 유지됐다.
### 저장 계층 DB 전환 준비 착수

PostgreSQL로 바로 옮기는 대신 저장소 경계를 먼저 잡는다. 현재 v2는 브라우저 `localStorage`와 IndexedDB가 저장소다. 다만 `useWardrobes`, `usePersonalColor`, `useSavedOutfits`가 저장 키와 저장 시점을 직접 알고 있어 나중에 서버 API 저장소로 바꿀 때 훅을 여러 번 수정해야 한다.

이번 작업은 새 DB를 붙이지 않는다. `services/appPersistence.ts`에 도메인별 저장 어댑터를 만들고, 훅은 이 어댑터만 호출하게 한다. 이렇게 하면 나중에 `localStorage` 구현을 FastAPI와 PostgreSQL API 호출 구현으로 교체할 때 UI 컴포넌트와 추천 엔진을 덜 건드릴 수 있다.

이미지 저장은 이번 범위에서 유지한다. 업로드 이미지 data URL을 `imageStore.ts`가 IndexedDB로 오프로드하고 `idb:` 마커를 남기는 구조는 PostgreSQL 전환 후에도 파일 스토리지 key 또는 URL 저장 방식으로 옮길 수 있다.

### 저장 계층 DB 전환 준비 구현 결과

`services/appPersistence.ts`를 추가해 퍼컬, 옷장, 저장 코디 저장 접근을 한 곳으로 모았다. 훅은 더 이상 `STORAGE_KEYS`, `loadJson`, `saveJson`, `localStorage.removeItem`을 직접 호출하지 않고, `localAppPersistence`의 도메인별 어댑터를 호출한다.

`services/storage.ts`에는 `removeJson`을 추가했다. 이 함수는 퍼컬 결과 초기화처럼 key 삭제가 필요한 경우에 쓰며, 직접 `localStorage.removeItem` 호출이 훅으로 새어 나가지 않게 한다.

`useSavedOutfits.ts`에는 `applySavedOutfitDailyLookUpdate`를 분리했다. 기존 구현은 `itemIds`를 생략할 수 있는 시그니처인데도 바로 `new Set(itemIds)`를 호출해 런타임 위험이 있었다. 새 헬퍼는 `itemIds`가 없으면 기존 아이템과 색상 목록을 유지하고 데일리룩 상태만 갱신한다.

RED 단계에서 `appPersistence.test.ts`와 `useSavedOutfits.test.ts`의 6개 테스트가 실패했다. 구현 후 추가 테스트 6개가 통과했고, 전체 `npm test`는 16개 파일 107개 테스트가 통과했다. `npm run build`도 통과했으며, 기존 Vite 대형 chunk 경고만 유지됐다.

### 옷장 색상 분석 팝업 레이어 착수

사용자가 사이드바와 현재 UI는 유지하고, 옷장에서 의류 색상 정보를 누르면 팝업 레이어로 상세 색상 분석을 보여 달라고 확정했다. 따라서 색상 분석은 퍼컬 결과 화면의 상시 섹션이 아니라 의류 카드에서 진입하는 레이어로 시작한다.

선택한 옷의 색상 기준은 의류의 `representativeHex`를 1차 입력으로 본다. dominant 색상이 있는 경우 팝업 안에서 상위 색상 목록을 함께 표시하되, 팝업을 여는 기준 색상은 카드에 보이는 대표 HEX와 일치해야 한다.

URL 입력이나 인터넷 사진 분석 기능은 이번에 구현하지 않는다. 다만 그 기능이 나중에 분석 완료 화면에서 같은 색상 분석 화면을 보여야 하므로, 계산은 `services` 계층의 재사용 함수로 두고 팝업 컴포넌트는 `features/wardrobe`에 묶이지 않는 공용 위치로 둔다.

### 옷장 색상 분석 팝업 레이어 구현 결과

`services/colorInsight.ts`를 추가했다. 입력은 대표 HEX, 시즌 ID, 출처 라벨이고 출력은 RGB, Lab, LCh, 최근접 팔레트 ΔE, 회피색 근접 감점, 시즌 적합도, 톤 태그, 색채이론 라벨, 스펙트럼 표시 좌표다. 계산은 새로 발명하지 않고 `domain/colorMath.ts`와 `domain/seasonSpectrum.ts`를 호출한다.

`features/color/ColorInsightModal.tsx`를 추가했다. 옷장뿐 아니라 URL·사진 분석 완료 화면에서도 재사용할 수 있게 `ColorInsight`와 item name, dominant HEX 목록만 props로 받는다. 화면은 `HEX → CIELAB/LCh`, `CIEDE2000`, `색채이론`, `LCh 스펙트럼`, 추천 팔레트, 회피색, 감지 색상을 나눠 표시한다.

`WardrobeSection.tsx`는 의류 카드의 대표 HEX 행을 `색상 정보 보기` 버튼으로 바꿨다. 버튼을 누르면 현재 퍼스널컬러 결과의 Top1 시즌 기준으로 팝업을 연다. `App.tsx`는 `personalColorResult`를 옷장 화면에 넘긴다.

RED 단계에서 신규 테스트 4개가 실패했다. 구현 후 타깃 테스트 3개 파일 4개 테스트가 통과했고, 전체 `npm test`는 19개 파일 111개 테스트가 통과했다. `npm run build`도 통과했으며, 기존 Vite 대형 chunk 경고만 유지됐다.

### 색상 분석 팝업 다듬기 — 스펙트럼 가독성과 정합성

첫 구현의 LCh 스펙트럼에는 세 가지 문제가 있었다. 배경이 실제 색과 무관한 고정 파스텔 그라데이션이라 축의 의미가 전달되지 않았고, 최근접 팔레트 마커가 좌표가 아니라 우하단에 CSS로 고정되어 "고채도·저명도 위치에 있다"는 오해를 만들었고, 시즌 영역 경계선이 배경에 묻혔다.

수정 방향은 다음과 같다. 배경은 현재 색의 HSL hue로 고정한 L×C 단면으로 바꿨다 — 세로는 위가 밝고 아래가 어두운 명도, 가로는 왼쪽 무채색에서 오른쪽 고채도로 가는 채도이며, 무채색 입력은 hue가 무의미하므로 회색 램프를 쓴다. `ColorInsight.spectrum`에 `nearestMarker` 좌표와 `gradientHslHue`를 추가해 최근접 팔레트 마커를 실제 LCh 위치에 그린다. 시즌 영역은 흰 점선과 어두운 외곽선의 이중 윤곽으로 어떤 배경에서도 보이게 했고 "시즌 영역" 라벨 칩을 붙였다. 25% 격자 오버레이, 고명도/저명도 세로축 칩, 마커 구분 범례를 추가했다.

정합성 수정 두 건도 함께 넣었다. 팝업 적합도 점수의 바닥을 0에서 15로 올려 추천 엔진의 clamp와 일치시켰고(같은 색이 팝업과 엔진에서 다른 점수로 보이는 문제 방지), 퍼컬 미측정 상태에서는 색상 정보 버튼을 비활성화하고 "퍼컬 측정 후 이용 가능" 문구를 보여 조용한 무반응을 없앴다.

검증. `npm test` 19개 파일 114개 테스트 통과(신규 3개 — 좌표·hue 데이터, 점수 바닥, 범례 렌더링), `npm run build` 통과. 브라우저에서 데모 소프트 서머 사용자로 옷장 → 의류 카드 → 색상 정보 팝업을 열어 hue 기반 배경, 좌표 마커 2개(현재 색 #818BAE와 최근접 팔레트가 시즌 영역 안에 나란히), 범례와 축 라벨을 스크린샷으로 확인했다.

### URL·인터넷 이미지 수집 — 구현 전 목업

구현에 앞서 `v2_md/url수집_목업.html`에 화면 목업을 만들었다. 탭으로 전환하는 4개 상태 화면이다 — ① 진입·주소 입력(기존 "나만의 옷 추가"에 URL 탭 추가, 새 화면 없음), ② 분석 중(5단계 진행 표시 — 페이지 가져오기, 대표 이미지 찾기, 배경 제거, 색상 추출, 초안 작성), ③ 초안 확인(핵심 화면 — 모든 자동 인식 필드에 "초안" 배지와 신호 출처 배지, "색상 분석 보기"는 ColorInsightModal 재사용, 저장 순간 사용자 확정), ④ 실패 폴백(이미지 주소 직접 붙여넣기 → 사진 업로드 전환, 실패는 정상 시나리오 톤).

각 화면 아래에 구현 메모를 붙였다. `POST /api/ingest/url` 단일 엔드포인트와 SSRF 가드, og:image → JSON-LD → 최대 이미지 3단 폴백(사이트별 스크래퍼 금지), 상품명 텍스트를 clothingMeta·warmthDerivation 신호로 재사용, `sourceType: 'url'`/`sourceRef`/`analysis.status` 기존 스키마 필드 사용, 기존 수동 등록과 같은 단일 병합 경로, imageStore 로컬 저장·재배포 없음.

구현 순서 제안도 목업 하단에 적었다 — 서버 프록시 → 화면 1·3과 초안→확정 저장 → 파싱 폴백 → 누끼·색 추출 → 상태 처리. 파싱 테스트는 저장된 HTML 픽스처로 오프라인 실행한다. 브라우저에서 탭 전환과 4개 화면 렌더링을 확인했다. 코드 변경은 없다.

### URL 수집 1단계 — FastAPI 프록시 착수

사용자가 목업을 확인하고 진행을 승인했다. 먼저 이전 색상 팝업·URL 목업 변경분을 커밋해 작업 단위를 분리했다. 커밋은 `573fdfb2 feat: 옷장 색상 분석 팝업과 URL 수집 목업 추가`다. `.claude`와 `node_modules/.vite/deps`의 기존 변경은 이번 작업과 무관하므로 제외했다.

이번 구현은 URL 수집 전체 완성이 아니라 서버 프록시 1단계다. 브라우저에서 직접 쇼핑몰 페이지나 외부 이미지 픽셀을 읽는 방식은 CORS와 canvas 보안 제한 때문에 신뢰할 수 없다. 따라서 `v2/server`에 FastAPI 앱을 두고 `POST /api/ingest/url`이 URL을 받아 서버에서 가져오는 경계부터 만든다.

안전 기준은 좁게 잡는다. http/https만 허용하고, DNS 해석 결과가 사설 IP·loopback·link-local·reserved·multicast·unspecified이면 차단한다. 리다이렉트가 있으면 Location을 절대 URL로 정규화한 뒤 같은 검사를 다시 수행하고, 최대 리다이렉트 횟수를 넘기면 실패시킨다. 응답은 정해진 byte 제한까지만 읽는다. Content-Type이 이미지면 `kind: image`, HTML이면 `kind: html`로 분기만 한다. og:image, JSON-LD, 최대 이미지 휴리스틱은 다음 단계로 남긴다.

테스트는 실제 쇼핑몰 네트워크를 쓰지 않는다. fake fetcher와 fake resolver로 이미지 응답, HTML 응답, 안전한 리다이렉트, 사설 IP 리다이렉트, 크기 초과를 재현한다. 이렇게 해야 발표·개발 환경에서 네트워크 상태와 특정 쇼핑몰 차단 정책에 테스트가 흔들리지 않는다.

### URL 수집 1단계 — FastAPI 프록시 구현 결과

`server/url_ingest.py`와 `server/app.py`를 추가했다. `url_ingest.py`는 FastAPI와 분리된 수집 서비스다. 입력 URL을 검증하고, DNS 해석 결과의 IP가 사설망·loopback·link-local·reserved·multicast·unspecified에 걸리면 fetch 자체를 하지 않는다. 리다이렉트 응답은 `Location`을 절대 URL로 바꾼 뒤 같은 검사를 반복한다. 기본 최대 리다이렉트는 4회, 기본 응답 크기 제한은 8MB다.

`HttpxUrlFetcher`는 `follow_redirects=False`로 단일 요청만 수행한다. `Content-Length`가 제한을 넘으면 본문을 읽기 전에 차단하고, 길이가 없거나 부정확한 응답은 streaming으로 읽으면서 누적 byte가 제한을 넘는 순간 차단한다.

`POST /api/ingest/url`은 지금 단계에서 분석 초안을 만들지 않는다. 응답은 수집 경계 계약만 돌려준다. 이미지 Content-Type이면 `kind: image`, HTML이면 `kind: html`이고, 공통으로 `sourceType: url`, `sourceRef`, `finalUrl`, `contentType`, `bytesRead`, `nextStep`을 반환한다. HTML의 `nextStep`은 `parse-product-page`이며 og:image·JSON-LD·최대 이미지 휴리스틱 파싱은 다음 단계다.

RED 단계에서 `python -m unittest server.tests.test_url_ingest -v`가 `ModuleNotFoundError: No module named 'server.app'`로 실패했다. 구현 후 같은 명령은 7개 테스트가 모두 통과했다. 테스트는 실네트워크 없이 fake fetcher와 fake resolver만 사용한다.

추가 검증으로 `npm test`를 실행해 19개 파일 114개 테스트가 통과했다. `npm run build`도 통과했으며, 기존 Vite 대형 chunk 경고만 유지됐다.

### URL 입력 UI 1차 연결 착수

사용자가 실제 앱에서 주소를 추가하는 곳이 없다고 지적했다. 확인 결과 원인은 서버 프록시만 구현되고 프론트 수동 등록 화면에는 URL 입력 탭과 `/api/ingest/url` 호출 함수가 아직 없기 때문이다.

이번 수정은 새 수집 플로우 전체 완성이 아니다. 기존 `나만의 옷 추가` 화면 안에 `사진 업로드`와 `URL로 가져오기` 입력 방식을 나누고, URL 입력 시 서버 프록시가 반환한 `kind`, `sourceRef`, `finalUrl`, `contentType`, `bytesRead`, `nextStep`을 확인 화면으로 보여준다. `kind: html`이면 다음 단계에서 대표 이미지 파싱으로 이어진다고 안내하고, `kind: image`면 다음 단계에서 이미지 분석으로 이어진다고 안내한다.

초안 ClothingItem 생성, 누끼·색 추출 연결, ColorInsightModal 재사용 분석 완료 화면은 다음 단계다. 지금 단계에서 저장 버튼이 URL 결과를 최종 옷장 아이템으로 저장하는 것처럼 보이면 안 된다.

### URL 입력 UI 1차 연결 구현 결과

`services/clothingImageApi.ts`에 `requestUrlIngest`를 추가했다. 이 함수는 JSON body `{ url }`로 `POST /api/ingest/url`을 호출하고, 서버가 반환한 `kind`, `sourceType`, `sourceRef`, `finalUrl`, `contentType`, `bytesRead`, `nextStep`을 그대로 돌려준다. 실패 응답은 FastAPI의 `detail` 메시지를 우선 사용한다.

`useManualClothing`에는 `urlImport` 상태와 `analyzeUrlImport` 액션을 추가했다. 상태는 URL 문자열, 진행 상태, 결과, 오류 메시지를 갖는다. 빈 주소는 프론트에서 즉시 안내하고, 실제 보안 판단은 서버 프록시가 한다.

`ManualAdd`에는 입력 방식 탭을 추가했다. 기본은 `사진 업로드`이고, `URL로 가져오기` 탭을 누르면 쇼핑몰 상품 주소나 이미지 주소 입력창과 `주소 분석` 버튼이 보인다. 분석 결과가 HTML이면 대표 이미지 파싱으로 이어질 예정임을, 이미지면 누끼와 색상 추출로 이어질 예정임을 안내한다. 아직 URL 결과를 저장 아이템으로 확정하지는 않는다.

RED 단계에서 `requestUrlIngest is not a function`과 `URL로 가져오기` 문자열 부재로 타깃 테스트 3개가 실패했다. 구현 후 `npm test -- src/services/clothingImageApi.urlIngest.test.ts src/features/wardrobe/WardrobeSection.urlIngest.test.ts`는 2개 파일 3개 테스트가 통과했다.

추가 점검에서 `vite.config.ts`에 `/api` 프록시가 없고 `package.json`에도 `dev:api` 스크립트가 없음을 확인했다. 입력창이 생겨도 Vite 개발 서버에서 FastAPI로 요청이 전달되지 않으면 실제 사용이 막히므로, `server.proxy['/api'] -> http://127.0.0.1:8001`, `npm run dev:api`, `/api/health` 라우트를 추가했다. RED 단계에서 프록시 설정 테스트 2개와 health 라우트 테스트 1개가 실패했고, 구현 후 프록시·URL 입력 타깃 테스트 5개와 서버 테스트 8개가 통과했다.

최종 검증으로 `npm test`를 실행해 22개 파일 119개 테스트가 통과했다. `npm run build`도 통과했으며, 기존 Vite 대형 chunk 경고만 유지됐다.

## 2026-07-03 URL 상품 페이지 대표 이미지 파싱

서버 파싱과 프론트 UI 표시가 완료되었다.

### 구현 내용

**서버 (`server/url_ingest.py`):**
- `_ProductHtmlParser`: og 메타, JSON-LD `application/ld+json` 스크립트, img 태그만 수집하는 최소 HTML 파서
- `parse_product_page()`: og:image → JSON-LD Product image 첫 배열/문자열 → img 태그 휴리스틱(가로×세로 면적 최대) 순서로 대표 이미지 탐색
- `_find_json_ld_product()`: 재귀적으로 JSON 트리를 순회하며 `@type: "Product"` 노드와 그 image/name 필드 추출
- `_decode_html_body()`: Content-Type 헤더의 charset 파싱 후 fallback to UTF-8
- `UrlIngestResult`에 `representative_image_url`, `product_title`, `parser_strategy` 필드 추가
- API 응답 camelCase 변환 (`representativeImageUrl`, `productTitle`, `parserStrategy`)
- `nextStep` 값: 이미지를 찾으면 `prepare-image-analysis`, 못 찾으면 `manual-image-url-fallback`

**테스트 픽스처 (`server/tests/test_url_ingest.py`):**
- og:image 추출 테스트(메타 태그, 상대경로 URL 정규화)
- JSON-LD Product 폴백 테스트(배열, 중첩 객체, @type 감지)
- 이미지 휴리스틱 테스트(너비×높이 비교)
- 이미지 없는 폴백 테스트(상품명만 유지, `next_step: manual-image-url-fallback`)
- 모든 11개 기존 보안·리다이렉트 테스트 통과 유지

**프론트엔드:**
- `UrlIngestApiResult` 타입에 세 필드 추가
- `WardrobeSection.tsx`: URL 결과 패널에 대표 이미지 미리보기 `<img>` 렌더, 상품명과 이미지 URL 표시
- 폴백 경로: `nextStep === 'manual-image-url-fallback'` 일 때 사용자에게 우클릭 이미지 주소 복사 또는 사진 업로드 권유
- `.url-ingest-thumbnail`: max 132×168px, contain으로 비율 유지, 보더 둥근 모서리
- 테스트: 4개 (API 호출, 필드 반환, WardrobeSection 진입점, 결과 패널)

### 검증

라이브 무신사 URL `https://www.musinsa.com/products/6736027`에서:
- og:image 전략으로 `https://image.msscdn.net/images/.../6736027_17824430836808_500.jpg` 정상 추출
- 상품명: `디스커스 애슬레틱(DISCUS ATHLETIC) 와일드헌트 플라이트 자켓 카키 - 사이즈 & 후기 | 무신사`
- UI에서 미리보기 이미지 렌더링, "대표 이미지 찾기 완료" 상태 표시

### 다음 단계

URL 초안 아이템 생성: 대표 이미지 미리보기 아래에 색상 분석 + 누끼 옵션 탭을 추가하고, 사용자 확정 후 신규 wardrobeItem(`sourceType: 'url'`, `sourceRef`, `analysis.status: 'draft'`) 생성.

## 2026-07-03 URL 대표 이미지 초안 연결

- 외부 CDN 이미지는 CORS와 canvas 오염 때문에 브라우저에서 직접 분석할 수 없다. 대표 이미지 바이트는 서버 프록시 `POST /api/ingest/image`로만 가져오고, URL 검사·리다이렉트 추적 로직을 공용 함수로 뽑아 SSRF 검사 지점을 한 곳으로 유지한다.
- URL 초안은 새 저장 경로를 만들지 않는다. 프록시로 받은 File을 사진 업로드와 같은 `autoAnalyzeOnUpload`에 태워, 폼·AI 배지·옷장에 저장 버튼까지 전부 기존 경로를 공유한다. 자동 인식은 초안이고 사용자 확정값이 최종 권한이라는 원칙이 그대로 유지된다.
- 상품명은 사이트 꼬리표(`| 무신사`, `- 사이즈 & 후기`)를 잘라 브랜드 입력의 초안으로 넣는다. `buildColorMeta`가 이름 신호(데님, 색 키워드)를 읽는 유일한 자유 텍스트 입력이 브랜드라서, 여기에 넣으면 분류 신호와 사용자 수정 가능성을 동시에 얻는다.
- `ClothingItem.sourceType`에 'url'을 추가하고 `sourceRef`에 원본 상품 주소를 기록해 저장 이후에도 출처를 추적할 수 있게 한다. 초안 상태 필드는 따로 저장하지 않는다. 확정은 옷장에 저장 시점에 일어나므로 저장된 아이템은 항상 확정값이다.

구현 중 v2 API 서버(8001)에 누끼 라우트가 없어서 사진 업로드와 URL 초안의 자동 분석이 모두 404가 나는 공백을 발견했다. v1 이미지 서버(`server/background_remove_api.py`)는 torch·rembg를 요청 시점에 lazy import하므로 모듈 자체는 가볍다. 다만 v2/server 패키지 이름이 루트 server 패키지와 겹쳐 일반 import가 불가능해, `v2/server/ml_bridge.py`에서 파일 경로 로딩(importlib)으로 모듈을 불러 `/api/background/remove`, `/api/clothing/extract` 두 라우트만 골라 v2 앱에 합쳤다. import 실패 시 None을 반환해 URL 수집 기능은 계속 동작한다.

검증 결과는 다음과 같다. 서버 테스트 17개 통과(이미지 프록시 3경로, 라우트 계약 4개 포함), 프론트 124개 통과, 빌드 통과. 무신사 실제 상품 URL로 주소 분석 → 대표 이미지로 초안 만들기 → SegFormer 정밀 누끼·색 추출(아우터/재킷 자동 인식, 대표색 #484830 카키, 브랜드 초안에 꼬리표 제거된 상품명) → 옷장에 저장까지 브라우저에서 확인했다. 저장된 아이템은 `sourceType: 'url'`과 `sourceRef`(상품 주소)를 갖는다.

운영 노트. uvicorn `--reload`의 파일 감시가 한글 경로에서 변경을 감지하지 못하는 경우가 있어, 서버 코드 수정 후에는 `npm run dev:api` 프로세스를 재시작해야 반영된다.

## 2026-07-04 등록 시 원본 사진 유지, 색상은 무조건 자동 조사, 누끼는 선택권으로 전환

사용자 의견: 쇼핑몰 옷이나 다른 사람이 등록한 옷은 정밀 누끼까지 자동으로 할 필요가 없고, 누끼는 데일리룩을 만들 때만 필요하다. 이어서 구체적 방향을 확정: 등록할 때는 원본 사진을 그대로 등록하되 누끼는 선택권(버튼)으로 남기고, 색상 조사만은 무조건 기본으로 실행한다.

기술적으로 확인한 사실. `extract_dominant_colors`(서버)는 알파 채널로 배경 픽셀을 제외하는 방식이라 색상 추출 자체는 세그멘테이션 결과에 의존한다. 즉 "색상 자동 조사"를 하려면 내부적으로는 여전히 배경 제거·세그멘테이션 연산이 필요하다. 다만 그 결과물인 컷아웃 이미지를 사용자에게 보여주는 화면(imageUrl/cutoutImageUrl)에 자동으로 반영할지는 별개의 선택이다.

구현. `useManualClothing.ts`의 `autoAnalyzeOnUpload`에서 `imageUrl: result.imageDataUrl`과 `cutoutImageUrl: result.imageDataUrl` 두 줄을 제거했다. 색상(`color`, `segmentation.colors`), 분류(`category`, `type`, `seasonTag`), 계절/재질 예측(`predictedSeasonTag`, `predictedMaterial`), `aiAnalyzed` 배지는 그대로 자동 반영된다. 사진 업로드든 URL 초안이든 등록 직후 화면에는 원본 사진이 남고, 기존에 이미 있던 "누끼 따기"/"정밀 누끼" 버튼이 사용자가 명시적으로 컷아웃을 적용하는 선택권 역할을 한다(새 UI를 만들지 않고 기존 버튼을 그대로 활용).

URL 흐름의 탭 전환 타이밍도 함께 조정했다. `adoptUrlImage`가 이제 성공 여부(boolean)를 반환한다 — 이미지 가져오기 자체가 실패하면 false를 반환해 URL 탭에 머물러 오류 메시지를 계속 보여주고, 이미지 가져오기가 성공하면(이후 색상·분류 자동 분석의 성공 여부와 무관하게) true를 반환해 사진 업로드 탭으로 전환한다. 자동 분석 실패는 업로드 탭의 기존 `backgroundRemoveError` 표시로 넘어가므로 별도 처리를 추가하지 않았다.

검증. 신규 소스 계약 테스트 5개(자동 분석이 imageUrl을 안 건드리는지, 색상/분류는 여전히 자동인지, 누끼 버튼 핸들러는 그대로 실제 컷아웃을 적용하는지, URL 초안 성공 시에만 탭 전환하는지) 추가, `npm run lint`·`npm test`(23개 파일 129개)·`npm run build` 통과. 무신사 URL로 브라우저 검증. 대표 이미지로 초안 만들기 직후 미리보기가 `blob:` 원본 이미지였고(컷아웃 아님), AI 배지에 아우터 자동 분류, 감지 색상 5개, 브랜드 초안 자동 반영을 확인했다. 이어서 "누끼 따기" 버튼을 눌러 미리보기가 실제 `data:image/png;base64,...` 컷아웃으로 교체되는 것도 확인해 선택권이 살아있음을 검증했다.

## 2026-07-06 제로베이스 FRD 작성과 Vercel 배포 타당성 분석

- 요청 배경. Vercel 실서비스 가능 여부를 종합 분석하고, 현 산출물이 전혀 없다고 가정한 리버스 엔지니어링 FRD를 새로 작성했다. 산출물은 `v2_md/FRD.md`. 기존 `v2_md/리버스frd.md`(v1 해부와 v2 이행 명세)와 역할을 분리해, 새 문서는 무전제 구축 명세(FR-1~12, 도메인 계약, 데이터 계약, API 계약, NFR, 배포 요구)로 썼다.
- 실측 확인. v2는 `npm test` 129개(23파일)와 `npm run build` 모두 통과(메인 청크 993KB·gzip 223KB, 청크 크기 경고만). 루트 v1 앱은 index.html과 vite.config.ts가 없어 `npm run build`가 실패한다 — v1은 참고 자산이고 배포 대상은 v2다.
- 배포 판정. v2 프론트와 카탈로그(git 추적 861장, 약 133MB)는 Vercel 정적 배포가 즉시 가능하다(Root Directory를 v2로 지정). 수집 API(httpx 경량, SSRF 가드)는 서버리스 함수로 이식 가능하다. ML 서버(torch+SegFormer)는 서버리스 번들 한도 밖이라 별도 호스트, 클라이언트 WASM 대체, 초기 제외의 3택이며, 골든 패스가 ML 없이 성립하므로 제외로도 출시가 된다.
- 걸림돌 기록. 루트 git에 node_modules가 추적되고 있어(전체 추적 파일 약 2.5만 개) 배포 전 .gitignore 정리가 필요하다. segformer-b3-fashion의 비상업 라이선스는 공개 서비스 차단 요인이라 FRD의 NFR-5와 §10에 계약으로 박아 두었다. CORS 전체 허용과 PhotoAnalyzer의 localhost 안내 문구는 프로덕션 수정 대상이다.

## 2026-07-06 Vercel 배포 준비 — 정적 SPA + 수집 API 서버리스 이식

방향. 배포 단위를 셋으로 자른다 — v2 정적 프론트(Vercel), 수집 API(Vercel 파이썬 함수), ML 서버(배포 제외). 골든 패스와 URL 수집이 ML 없이 성립하므로 초기 서비스는 ML 없이 내고, 누끼·자동 분석은 로컬 서버 전용으로 남긴다.

구현.
- `api/index.py` 서버리스 엔트리는 새 FastAPI 앱에 `server.app`의 라우트 중 /api/health, /api/ingest/url, /api/ingest/image 세 개만 골라 담는다(ml_bridge와 같은 라우트 복사 패턴). CORS 미들웨어는 복사하지 않는다 — 같은 도메인 전용 프록시라 교차 출처를 열면 외부 사이트가 이 프록시를 남용할 경로가 생긴다. ML 두 경로(/api/background/remove, /api/clothing/extract)는 503 + 한국어 안내 detail 스텁으로 대체했다.
- 프론트 requestBackgroundRemoval/requestPrecisionExtraction이 오류 시 서버 detail을 읽도록 보강해(readErrorDetail 재사용), ML 없는 배포에서 업로드 자동 분석이 "정밀 누끼 API 오류: 404" 같은 원시 코드 대신 배포 안내 문구로 실패하게 했다.
- vercel.json은 /api/(.*) → /api/index 리라이트와 함수 excludeFiles(public·catalog 등 정적 자산 133MB가 파이썬 함수 번들 250MB 한도를 위협하지 않게 제외)로 구성했다. requirements.txt는 fastapi+httpx 최소 구성이다.
- 루트 .gitignore를 신설하고 node_modules(약 2만 파일)·dist·로그·.playwright-mcp를 추적 해제해 추적 파일을 24,799개에서 3,813개로 줄였다. PhotoAnalyzer 카메라 안내 문구의 localhost 전제도 HTTPS 기준으로 고쳤다.

검증. 서버 pytest 21개(기존 17 + 엔트리 계약 4) 통과. 단 py313 환경에서는 v1 레거시 모듈 의존성이 없어 기존 브리지 마운트 테스트 1개가 실패하므로 서버 테스트는 anaconda3 파이썬으로 돌려야 한다. 프론트 npm test 131개(24파일)와 npm run build 통과. uvicorn으로 api.index:app을 8002 포트에 띄워 라이브 확인 — example.com 실수집 200(kind html), 127.0.0.1 SSRF 차단 400, ML 스텁 503 안내 문구, 교차 출처 요청에 ACAO 헤더 없음까지 계약대로였다.

남은 것. GitHub push 후 Vercel에서 Root Directory를 v2로 지정해 임포트하면 된다. ML을 살리려면 별도 호스트(HF Spaces, Cloud Run 등)에 v1 이미지 서버를 올리고 vercel.json rewrite로 /api/background·/api/clothing 경로만 그쪽으로 돌린다.

## 2026-07-06 PWA 전환 — 설치형 앱 지원

문제 진단(현 코드 기준). PWA 기반(매니페스트·서비스 워커·아이콘·메타)이 전무해 설치 자체가 불가능했고, 최대 함정은 카탈로그였다 — 기본 설정으로 vite-plugin-pwa를 붙이면 dist의 PNG 861장(약 133MB)이 설치 시점 프리캐시에 통째로 들어간다. 그 밖에 MediaPipe CDN 의존(오프라인 첫 실행 시 사진 진단 불가), 날씨 API 오프라인 무대응, 기기 로컬 저장 데이터의 브라우저 회수 위험이 있었다.

구현.
- vite-plugin-pwa 1.3.0, registerType autoUpdate — 새 배포가 있으면 다음 방문에서 자동 갱신된다.
- 프리캐시는 앱 셸만(js/css/html/아이콘, 14항목 1,236KiB). 카탈로그는 CacheFirst 런타임 캐시(catalog-images, maxEntries 300, 30일, LRU·quota 정리)로 분리해 본 것만 쌓인다.
- MediaPipe wasm·모델(cdn.jsdelivr.net, storage.googleapis.com)은 CacheFirst 1년 캐시 — 첫 진단 이후에는 오프라인에서도 얼굴 분석이 된다(설문 단독 폴백은 기존대로). 날씨·역지오코딩은 NetworkFirst 4초 — 오프라인이면 최근 응답으로 폴백.
- 매니페스트는 한국어(퍼스널컬러 옷장/퍼컬옷장), standalone, 시작 경로 '/'. 아이콘은 4계절 컬러휠 모티프 4종(192/512/maskable 512/apple-touch 180)을 PIL supersampling으로 생성해 public/icons에 넣었다. index.html에 theme-color와 apple 계열 메타 추가.
- main.tsx에서 registerSW({immediate:true})와 navigator.storage.persist()를 호출한다 — 옷장·진단 데이터가 전부 기기 저장소라 회수 제외 요청이 필요하다. tsconfig types에 vite-plugin-pwa/client를 추가했다.
- navigateFallback은 index.html, /api 경로는 denylist라 수집 프록시와 충돌하지 않는다.

검증. lint·vitest 131개·빌드 통과, 빌드 로그에서 프리캐시 14항목 1,236KiB 확인(카탈로그 미포함은 sw.js 내 catalog 문자열이 런타임 라우트 정규식뿐인 것으로 재확인). vite preview(4173)에서 SW activated+페이지 제어, 매니페스트 200, 카탈로그 이미지 fetch가 catalog-images 캐시에 적재되고 전체 저장소 사용량 3.4MB에 그침, 콘솔 에러 0, 홈 대시보드 렌더(실시간 날씨 포함)까지 확인했다.

남은 기기 의존 확인. iOS 스탠드얼론에서 카메라(getUserMedia)와 데일리룩 PNG 다운로드(a[download])는 iOS 버전별 편차가 있어 실기기 확인이 필요하다. 다운로드가 막히는 기기에서는 Web Share API(navigator.share files) 폴백이 다음 후보다. iOS는 홈 화면 설치 시 7일 미사용 저장소 삭제 정책에서 제외되므로 설치가 오히려 데이터 영속성에 유리하다.

## 2026-07-08 퍼컬 진단 백지 화면 복구

증상은 v2 앱 3100번 홈에서 `측정 시작`을 누르면 `#root`가 빈 문자열이 되고 화면이 백지로 바뀌는 것이다. 브라우저 콘솔에는 `Invalid hook call`이 두 번 찍히고, 실제 예외는 `@base-ui/react/button`의 `useButton`에서 `React.useRef` dispatcher가 null이 되는 형태였다.

패키지 확인 결과 v2의 로컬 React는 `19.2.7`이고, 상위 루트의 React는 `19.2.5`였다. v2 `package.json`과 lockfile에는 `@base-ui/react`가 없지만 `v2/components/ui/button.tsx`와 `progress.tsx`가 `@base-ui/react`를 import하고 있었다. 따라서 퍼컬 진단 화면 진입 시 상위 루트의 Base UI와 React 사본이 함께 번들에 섞이는 것이 직접 원인이다.

의존성을 추가 설치하는 방법도 가능하지만, 이 화면에서 필요한 기능은 버튼과 진행바의 기본 렌더링뿐이다. 네트워크 설치와 lockfile 변동을 만들기보다 v2 내부 UI 원시 컴포넌트를 네이티브 `button`과 `div` 기반으로 단순화해 상위 의존성을 타지 않게 하는 쪽이 더 작고 검증하기 쉽다.

구현 결과 `components/ui/button.tsx`는 `variant`, `size`, 일반 button props를 받는 네이티브 `button`으로 바뀌었고, `components/ui/progress.tsx`는 `value`를 width로 반영하는 네이티브 `div` 진행바로 바뀌었다. `src/app/uiDependencyBoundary.test.ts`는 퍼컬 진단에 직접 쓰이는 `button.tsx`, `progress.tsx`가 `@base-ui/react`를 다시 import하지 못하게 막는다.

검증 결과 표적 테스트는 RED 후 GREEN을 확인했고, 전체 `npm test`는 25개 파일 132개 테스트가 통과했다. `npm run build`도 통과했으며, Vite는 기존과 같은 500kB 초과 chunk 경고만 냈다. 브라우저에서 `http://localhost:3100`의 `측정 시작`을 누르면 `사진 분석 모듈`이 보이고 `#root` 길이가 12327로 유지되었다. 새 로그 기준 `Invalid hook call`은 다시 나오지 않았고 MediaPipe wasm 경고만 남았다.

## 2026-07-10 ColorFit UI 적용 1단계 — 디자인 토큰·공통 셸·홈·브랜딩

사용자 결정. colorfit-ui-v6.zip 디자인을 단계별로 전면 적용한다. 브랜딩은 ColorFit으로 교체, Tailwind는 걷어내고, 색상 모달은 기존 CIEDE2000 로직에 새 디자인만 입히며, 데일리룩은 새 UI에 맞춰 로직도 개선한다. 12계절 표시 데이터(팔레트·문구)는 프로토타입 값을 채택하되 판정 로직 권위는 도메인 모듈이 유지한다.

구현 방식. 프로토타입 CSS(1,618줄)는 재작성하지 않고 `src/colorfit.css`로 통째 이식했다 — 4세대 캐스케이드(베이스→V3→V4→V5)의 순서가 곧 디자인이므로 "최종 승자 값 추출" 대신 순서 보존이 더 안전하다. 파일 머리에 재배치 금지 주석을 박았다. 로드 순서는 index.css(레거시) → colorfit.css로, 클래스 충돌(.panel 등 18개) 시 새 디자인이 이기게 했다. 미이식 화면은 전환기 동안 색·질감만 살짝 물드는 수준의 표류를 감수하고, 각 단계에서 해당 화면의 레거시 CSS 블록을 걷어낸다.

- 예시 얼굴 사진(Unsplash)이 CSS `.camera-stage::before` 배경에 숨어 있어 URL만 제거했다(그라디언트 유지). 2단계에서 실제 카메라 video가 이 자리를 채운다.
- `seasonDisplay.ts`는 프로토타입 script의 seasonProfiles(12계절 × 24색 팔레트 + 9색 usage + 4축 + 마커 + 문구)를 node 스크립트로 자동 추출해 생성했다 — 수기 전사 오류 없음. 키는 v2 SeasonId와 정확히 일치한다.
- `useSeasonTheme` 훅이 프로토타입 applySeason의 인덱스 규약([0],[4],[17],[21],[3])대로 --season-1~4·--season-deep을 주입한다. `App.tsx`의 라우트 effect가 body[data-route]와 퍼컬 화면 한정 chromatic-mode를 토글한다.
- 셸은 프로토타입 규약(app-shell/sidebar/workspace/topbar/screen[data-screen], 모바일 mobile-header+bottom-nav 5탭)으로 재작성. 아이콘은 인라인 SVG 심볼 대신 기존 lucide-react에 `.icon` 클래스를 입혔다(CSS stroke 속성이 프레젠테이션 속성을 덮어 굵기 1.8 통일).
- Pretendard Variable(2MB)을 public/fonts에 셀프호스팅하고 PWA 프리캐시에 포함(총 3.5MB). Tailwind import 제거 — 컴파일되지 않는 죽은 상태였으므로 시각 변화는 preflight 소실뿐이며 colorfit.css 베이스가 대체한다.
- PWA manifest·아이콘·index.html 타이틀을 ColorFit으로 교체하고 구 아이콘 4종은 삭제했다.

검증. tsc 통과, vitest 132개 통과(문자열 계약 테스트 포함), 프로덕션 빌드+PWA 생성 통과. 프리뷰(3102)에서 실데이터 바인딩 확인 — 사이드바 프로필 '소프트 서머', 홈 키커 'FRIDAY · 26°C · SOFT SUMMER', 날씨 칩(23~27도·우산 챙기기·마스크 선택·서울 기준), --season-1이 소프트 서머 팔레트(#F3EDEB)로 주입, 모바일(375px)에서 bottom-nav 글래스 바 표시, 옷장 탭 전환·탑바 제목 갱신 동작. 스크린샷 캡처는 프리뷰 환경의 backdrop-filter 합성 한계로 타임아웃 — 구조(snapshot)와 계산 스타일(inspect)로 대체 검증했다.

남은 단계. 2단계 퍼컬 3화면(chromatic-mode 연출, 실카메라를 camera-stage에 결합, 결과 화면 liquid hero + seasonDisplay 데이터), 3단계 옷장·카탈로그·옷 추가(색상 모달 orb 스킨), 4단계 추천·룩 보관함·데일리룩(캔버스 로직 개선 — 레이어 목록 동기화·z-order·회전 슬라이더). 각 단계에서 해당 화면 레거시 CSS 제거.


## 2026-07-10 ColorFit UI 전면 이식 재정의

직전 1단계는 V6 홈 구조를 먼저 옮겼지만, 사용자가 중요하게 본 원본 앱의 진입 구조가 약해졌다. 이번 작업은 정적 목업을 그대로 복제하지 않는다. 원본 앱에서 이미 익숙한 버튼과 화면 흐름을 레이아웃 권위로 두고, V6는 재질, 색상, 밀도, 정보 우선순위의 권위로 사용한다.

선택한 방식은 컴포넌트별 구조 이식이다. 정적 HTML로 앱을 교체하면 실제 상태와 분석 로직이 사라지고, CSS만 덧씌우면 현재처럼 클래스 계약이 맞지 않는다. 따라서 `App.tsx`의 라우팅과 훅, 도메인 서비스는 유지하면서 `HomeDashboard`, `PhotoAnalyzer`, `Questionnaire`, `PersonalResult`, `WardrobeSection`, `RecommendationDashboard`, `SavedOutfits`, `TryOn`, `ColorInsightModal`의 마크업과 화면 전용 CSS를 맞춘다.

시각 모드는 세 가지로 제한한다. 기본 모드는 높은 불투명도와 얕은 그림자를 쓰는 차분한 표면이다. 크로마틱 모드는 퍼컬 3단계에서만 시즌 팔레트와 리퀴드 효과를 사용한다. 포커스 글라스 모드는 색상 분석 팝업 한 곳에서만 깊은 블러와 컬러 오브를 사용한다. 모든 카드에 글라스를 반복하지 않는다.

데일리룩 폴더는 단순 시각 필터가 아니라 저장 계약에 포함한다. 기존 저장 코디는 `folderId`가 없어도 전체 폴더에서 정상 노출되도록 호환하고, 새 폴더 목록과 즐겨찾기 상태는 브라우저 저장소 어댑터를 통해 유지한다.


## 2026-07-11 V5 Exact를 새 시각 기준으로 채택

사용자가 완성형 React 참조인 colorfit-react-v5-exact를 제공했다. 이 프로젝트는 13개 화면과 V5 CSS를 정적 프로토타입으로 보존하지만 실제 v2 도메인 로직은 포함하지 않는다. 따라서 참조 앱을 복사해 덮는 방식은 사용하지 않는다.

결정은 다음과 같다.

- 홈 화면의 구조는 V5 Exact를 우선한다. 하드코딩된 18도, 42벌, 라이트 스프링 대신 현재 날씨, 퍼컬 결과, 의류 수, 추천 수를 사용한다.
- 현재 v2의 퍼컬 촬영과 설문, 이미지 분석 API, 추천 엔진, 저장 adapter, PWA 경계를 유지한다.
- 데일리룩 편집은 V5 정적 controller보다 v2의 React 레이어 편집기가 기능적으로 우수하므로 유지한다.
- 보관함 폴더는 V5 시각 구조를 사용하되 현재 추가된 SavedLookFolder 저장 계약을 확장한다.
- 기본 폴더는 보호하고 사용자 폴더만 이름 변경과 삭제를 허용한다. 사용자 폴더 삭제 시 포함 룩은 folder-daily로 이동한다.
- wardrobeHealthScore와 readyWardrobeCount는 화면뿐 아니라 App과 hook 반환 계약에서도 제거한다.
- 폰트는 V5 패키지 설정으로 바꾸지 않고 v2의 Pretendard Variable을 유지한다.


## 2026-07-11 V5 Exact 통합 구현과 브라우저 검증

V5 Exact는 시각 구조의 기준으로만 사용하고 v2 훅과 서비스는 그대로 유지했다. 홈은 home-layout, today-panel, home-side, home-lower를 실제 퍼컬 결과, 날씨, 옷 수, 추천 수, 최근 저장 룩에 연결했다. Pretendard Variable을 최우선 폰트로 유지했고 일반 화면의 장식 오브는 제거했다.

옷장 준비도는 useWardrobes의 wardrobeHealthScore와 readyWardrobeCount, App 구조분해와 전달 props, WardrobeSection 계약, health-ring CSS까지 제거했다. 화면에는 옷장 수, 등록한 옷, 카테고리, 최근 추가 수와 실제 색상 구성을 사용한다.

룩 보관함은 기본 폴더를 보호하고 사용자 폴더만 이름 변경과 삭제를 허용한다. renameSavedLookFolderState와 deleteSavedLookFolderState를 순수 함수로 테스트했고, 사용자 폴더 삭제 시 해당 룩의 folderId를 folder-daily로 옮긴다. 브라우저에서는 임시 폴더를 생성하고 이름을 바꾼 뒤 삭제해 사용자 폴더 행이 사라지고 기본 폴더가 유지되는 것을 확인했다.

데일리룩은 v2의 레이어 캔버스, 자동 배치, 텍스트, 완성 이미지 로직을 유지했다. 포인터 이동은 requestAnimationFrame 단위로 제한한다. 모바일 공통 규칙이 자동 배치 버튼을 숨기는 문제를 브라우저에서 발견해 데일리룩 화면에서만 다시 노출했고, 폴더 행은 가로 스와이프를 유지하면서 기본 스크롤바를 감췄다. 홈에서는 의미 없는 모바일 뒤로가기 버튼을 제거했다.

브라우저 검증은 1280x900과 390x844에서 진행했다. 홈, 옷장, 옷 추가, 룩 보관함, 데일리룩 편집, 퍼컬 결과와 촬영 화면이 렌더됐고 문서 수평 오버플로는 없었다. 퍼컬 촬영 화면은 비디오와 캔버스가 유지되어 기존 백지 화면이 재발하지 않았다. 새로고침 전후 로그를 비교했을 때 신규 오류는 없었고 MediaPipe 자체 경고와 전날 Vite HMR 기록만 남아 있었다. 임시 뷰포트 오버라이드는 검증 후 해제했다.

최종 npm run lint와 npm test는 통과했고 결과는 27개 파일 142개 테스트다. 프로덕션 빌드는 통합 1차 상태에서 성공했으며 PWA 산출물도 생성됐다. 마지막 모바일 CSS와 홈 헤더 보정 뒤 빌드 재실행은 실행 승인 사용 한도로 차단되어 남은 검증으로 기록한다.

관련 v2 파일만 git add로 스테이징하려 했으나 .git/index.lock 쓰기가 샌드박스에서 거부됐고, 권한 상승 재시도도 실행 승인 사용 한도로 차단됐다. 우회하지 않고 커밋을 남은 작업으로 유지한다.


## 2026-07-11 데일리룩 편집 고도화

DailyLookState에 background 필드를 추가하고 buildDailyLookState에서 이전 값을 보존하되 기본값 #f8f9fb를 지정했다. 배경색은 화면 캔버스 .dailylook-stage의 인라인 backgroundColor(편집용 격자 배경은 유지)와 renderConfirmedImage의 fillStyle 양쪽에 반영했다. 배경 변경 시 isConfirmed를 false로 되돌리고 onSaveDailyLook으로 저장한다.

선택된 옷 레이어에 캔버스 위 조작 핸들을 추가했다. 텍스트 리사이즈 패턴을 참고해 모서리 크기 핸들은 중심 거리 비율로 scale을 0.35~1.55로 clamp하고, 상단 회전 핸들은 중심 기준 각도 변화로 rotation을 -25~25로 clamp한다. 포인터 캡처와 scheduleCanvasUpdate(RAF)를 그대로 활용했다. 부모가 button이라 중첩 button을 피하려고 핸들은 role=button span으로 두고 pointer 이벤트에서 stopPropagation한다. 기존 슬라이더도 유지한다.

removeLayer를 추가해 선택 레이어를 layers와 draftItemIds에서 함께 제거하고 상태를 저장한다. 레이어 편집 패널의 tool grid에 삭제 버튼을 두었다. 새 CSS는 colorfit.css의 .dailylook-* 규칙 근처에 배경 컨트롤과 핸들 스타일로 추가했다.
