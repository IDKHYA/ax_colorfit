# ML 서비스 로컬 실행 + ngrok 노출 가이드

작성일: 2026-07-16.

이 문서는 `ml_service/`(FR-040/041 독립 ML 서비스)를 별도 호스팅 없이 내 컴퓨터에서 계속 돌리고, ngrok으로 공인 URL을 만들어 Vercel에 배포된 프론트가 그 URL을 호출하게 하는 방법을 정리한다. 실제 계정 생성과 터널 실행은 사용자가 직접 해야 하며(외부 서비스 가입은 대신 할 수 없음), 이 문서는 순서와 각 단계에서 확인해야 할 값만 안내한다.

## 왜 이 방식인가

`ml_service`는 모델 두 개(u2net, u2net_cloth_seg)를 프로세스 메모리에 상주시킨다. Render 같은 무료 호스팅은 512MB RAM 제한이 있어 실측 기준으로 여유가 크지 않았다. 반면 내 컴퓨터에서 직접 실행하면 RAM 제약이 사실상 없고 별도 배포 비용도 들지 않는다. 대신 **내 컴퓨터가 켜져 있고 인터넷에 연결돼 있을 때만** ML 기능(자동 누끼·색상 분석)이 동작한다. 컴퓨터가 꺼지거나 ngrok이 끊기면 프론트는 이미 구현된 FR-042 장애 대체 경로(원본 사진 + 수동 등록)로 자동 전환되며, 앱 자체가 죽지는 않는다.

## 1. 로컬에서 ML 서비스 실행

```bash
pip install -r ml_service/requirements.txt
npm run dev:ml
# 또는 직접: uvicorn ml_service.app:app --host 0.0.0.0 --port 8501
```

- 첫 실행 시 모델 파일(u2net.onnx, u2net_cloth_seg.onnx, 각 176MB)을 자동으로 내려받는다(수 분 소요, 이후 캐시됨).
- `http://127.0.0.1:8501/api/health`에서 `{"ok": true, "modelsReady": true, ...}`가 뜨면 정상이다.

## 2. ngrok 설치와 로그인

1. https://ngrok.com 에서 계정을 만든다(무료 플랜으로 충분).
2. ngrok 대시보드에서 발급되는 **authtoken**을 확인한다.
3. 설치 후 로그인한다.

```bash
ngrok config add-authtoken <내_authtoken>
```

## 3. 고정 도메인 설정 (재시작해도 URL이 안 바뀌게)

ngrok 무료 플랜은 계정당 **고정 서브도메인 1개**를 무료로 제공한다.

1. ngrok 대시보드 → Domains → "Create Domain"에서 무료 고정 도메인(예: `xxxxx.ngrok-free.app` 형태)을 하나 만든다.
2. 터널 실행 시 그 도메인을 지정한다.

```bash
ngrok http --url=<발급받은_고정_도메인> 8501
```

고정 도메인을 만들지 않으면 매번 랜덤 URL이 생성되어, 재시작할 때마다 Vercel 환경변수를 다시 바꿔야 한다.

## 4. Vercel 프론트에 ML 서버 주소 연결

Vercel 프로젝트 설정 → Environment Variables에 추가한다.

```
VITE_ML_API_BASE_URL=https://<고정_도메인>
```

(로컬 개발 시에는 `.env.local`에 같은 값을 넣으면 된다 — `.env.example` 참고.)

## 5. CORS 허용 도메인 설정

`ml_service`는 기본적으로 `http://localhost:3100`만 CORS를 허용한다. 실제 Vercel 배포 도메인이 정해지면 `ml_service` 실행 시 환경변수로 지정해야 한다.

```bash
ALLOWED_ORIGINS=https://<실제_Vercel_도메인> npm run dev:ml
```

여러 출처를 허용하려면 콤마로 구분한다: `ALLOWED_ORIGINS=https://a.com,https://b.com`.

## 6. 확인 체크리스트

- [ ] `ml_service` 로컬 실행 중 `/api/health`가 200을 반환한다.
- [ ] ngrok 터널이 고정 도메인으로 떠 있고, 외부에서 `https://<고정_도메인>/api/health`에 접속된다.
- [ ] Vercel 환경변수 `VITE_ML_API_BASE_URL`이 그 도메인으로 설정돼 있다.
- [ ] `ml_service`의 `ALLOWED_ORIGINS`가 실제 Vercel 도메인을 포함한다.
- [ ] 컴퓨터/ngrok을 끈 상태에서도 옷 추가 화면이 "AI 분석 서버에 연결할 수 없습니다" 안내와 함께 원본 사진 + 수동 등록으로 정상 완료되는지 재확인한다(FR-042).

## 참고

- 저메모리 배포 프로필(`ENABLE_CLOTH_SEGMENTATION` 환경변수)은 Render 같은 RAM 제한 호스팅을 염두에 두고 한때 추가했으나, 로컬+ngrok 방식으로는 RAM 제약이 없어 불필요해져 되돌렸다(2026-07-16). onnxruntime 메모리 아레나 비활성화(`models.py`)는 로컬에서도 메모리를 아껴 주므로 그대로 유지한다.
- 이 방식은 개인/소규모 데모 배포에 적합하다. 트래픽이 늘거나 24/7 가용성이 중요해지면 유료 상시 호스팅(Fly.io 약 $5/월 등) 전환을 다시 검토하는 것이 좋다.
