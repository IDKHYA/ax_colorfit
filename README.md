# ColorFit — 퍼스널컬러 옷장

12계절 퍼스널컬러 진단과 실제 보유 의류 기반 코디 추천을 제공하는 PWA입니다. 얼굴 사진/설문으로 퍼스널컬러를 진단하고, 옷장을 등록해 날씨·퍼스널컬러·색상 조화를 반영한 추천을 받을 수 있습니다.

## 구성 요소

이 저장소는 세 부분으로 나뉩니다.

| 구성 | 역할 | 실행 명령 |
| --- | --- | --- |
| 프론트엔드 (`src/`) | React 19 + Vite SPA/PWA | `npm run dev` |
| 경량 API (`server/`) | 상품 URL/이미지 수집(SSRF 가드 포함), 로컬 개발용 | `npm run dev:api` |
| 독립 ML 서비스 (`ml_service/`) | 일반 누끼·정밀 의류 추출(rembg 기반) | `npm run dev:ml` |

Vercel에는 프론트엔드와 `api/index.py`(경량 API의 서버리스 축소판)만 배포됩니다. ML 서비스는 Vercel에 올라가지 않고 별도로 실행해야 합니다(아래 참고).

## 빠른 시작

```bash
npm install
npm run dev        # http://localhost:3100
npm run dev:api     # 포트 8001 — URL/이미지 수집 API
npm run dev:ml      # 포트 8501 — ML 서비스 (첫 실행 시 모델 파일 자동 다운로드, ~350MB)
```

`ml_service`를 처음 실행하면 `u2net`, `u2net_cloth_seg` 모델(각 176MB)을 자동으로 내려받습니다. 이후에는 캐시돼 바로 뜹니다. `http://127.0.0.1:8501/api/health`에서 `modelsReady: true`가 뜨면 정상입니다.

## 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 필요한 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `VITE_ML_API_BASE_URL` | ML 서비스 기준 URL. 비워두면 같은 출처 `/api/...` 상대 경로를 쓴다(로컬 프록시·Vercel rewrite와 호환). ML 서비스를 다른 곳(로컬 다른 포트, ngrok 등)에서 띄웠다면 그 주소를 넣는다. | (없음 — 상대 경로) |
| `VITE_DEMO_MODE` | `true`로 두면 촬영 없이 소프트 서머 데모 결과로 앱을 시연할 수 있다. 일반 배포에서는 비워둔다. | (없음 — 신규 사용자는 미진단 상태로 시작) |

ML 서비스(`ml_service`) 쪽 환경변수:

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | CORS로 허용할 프론트 origin(콤마로 여러 개 지정 가능) | `http://localhost:3100` |

## ML 서비스를 내 컴퓨터에서 돌리고 외부에 노출하기 (ngrok)

무료 클라우드 호스팅(Render 등)은 RAM 제한 때문에 이 서비스에 넉넉하지 않습니다. 대신 내 컴퓨터에서 `ml_service`를 계속 띄워 두고 ngrok으로 공인 URL을 만들어 Vercel 프론트가 그 주소를 호출하게 하는 방법을 씁니다. 설치부터 고정 도메인 설정, Vercel 환경변수 연결까지 전체 순서는 [refactoring/ml-service-ngrok-guide.md](refactoring/ml-service-ngrok-guide.md)에 정리되어 있습니다.

요약:

```bash
npm run dev:ml                                              # 1) 로컬 ML 서비스 실행 (포트 8501)
ngrok http --url=<발급받은_고정_도메인> 8501                    # 2) ngrok 터널 (무료 고정 도메인 1개 지원)
```

그 다음 `.env.local`(로컬) 또는 Vercel 프로젝트 환경변수(배포)에 `VITE_ML_API_BASE_URL=https://<고정_도메인>`을 설정합니다.

ML 서비스가 꺼져 있거나 ngrok이 끊겨도 앱 전체가 죽지 않습니다 — 옷 등록 화면은 "AI 분석 서버에 연결할 수 없습니다" 안내와 함께 원본 사진 + 수동 입력으로 등록을 완료할 수 있는 대체 경로를 제공합니다.

## 빌드 / 테스트

```bash
npm run build       # tsc --noEmit && vite build
npm run lint        # tsc --noEmit (ESLint 없음 — 타입 체크가 lint를 겸함)
npm test            # vitest run

pytest server/tests ml_service/tests    # 백엔드 테스트 (경량 API + ML 서비스)
```

## 더 읽을거리

- [`CLAUDE.md`](CLAUDE.md) — 코드베이스 구조, 도메인 레이어, 카탈로그 데이터 흐름 등 개발 참고 문서.
- [`docs/`](docs) — 도메인 로직 인벤토리, v2 스키마 계약 등 설계 문서.
- [`refactoring/`](refactoring) — 독립 서비스화(부모 저장소 의존 제거, ML 서비스 복구) 작업의 계획·체크리스트·의사결정 기록.
