# 3d-widget-web-host

## 3D 임베드 테스트 (Vite + Babylon) - 모노레포

이 저장소는 **3D 위젯(서버 A)** 과 **위젯을 임베드하는 호스트 웹(서버 B)** 을 분리해서,
개발/배포 관점에서 “원격 모듈 임베드” 흐름을 테스트하기 위한 예시입니다.

## 문서

- 작동 방식: `docs/how-it-works.md`
- 다른 프로젝트 적용 가이드: `docs/integration-guide.md`
- 운영 배포 시나리오: `docs/production-deployment.md`
- 호스팅 방식 비교(통합 vs 분리/CDN): `docs/hosting-tradeoffs.md`

## 앱 구성 (Babylon / Three.js 동일 구조)

**Babylon.js** (`apps/babylon/`)

- `apps/babylon/3d-widget` (기본 포트 5101) — Babylon.js 위젯, `mountBabylon(canvas)` export
- `apps/babylon/web-host` (기본 포트 5100) — 호스트 웹앱, 원격 위젯 import
- `apps/babylon/combined-app` (기본 포트 5102) — 로컬 import 결합 앱(로딩타임 비교용)

**Three.js** (`apps/three/`)

- `apps/three/3d-widget` (기본 포트 5201) — Three.js 위젯, 동일 API `mountBabylon(canvas)` export
- `apps/three/web-host` (기본 포트 5200) — 호스트 웹앱
- `apps/three/combined-app` (기본 포트 5202) — 로컬 import 결합 앱

## 실행

```bash
npm install
# Babylon (기본)
npm run dev
# Three.js
npm run dev:three
```

- **Babylon** Host: `http://localhost:5100`, Widget: `http://localhost:5101`, Combined: `http://localhost:5102`
- **Three.js** Host: `http://localhost:5200`, Widget: `http://localhost:5201`, Combined: `http://localhost:5202`

## Docker (docker-compose)

아래 env 파일 값(특히 `WIDGET_HOST`, `WIDGET_PUBLIC_PORT_BABYLON`, `WIDGET_PUBLIC_PORT_THREE`)을 환경에 맞게 수정해서 사용합니다.

- `.env.full.babylon` / `.env.webhost.babylon` (Babylon)
- `.env.full.three` / `.env.webhost.three` (Three.js)

```bash
# Babylon (Host+Widget+Combined)
docker compose up --build full-babylon

# Three.js (Host+Widget+Combined)
docker compose up --build full-three

# 둘 다 동시에
docker compose up --build full-babylon full-three
```

## 포트/호스트/위젯 주소를 쉽게 바꾸는 법(중요)

**루트 `config/dev-config.ts` 한 파일만 수정**하면 3개 앱의 포트/호스트와 web-host가 가져올 위젯 기본 주소가 같이 바뀝니다.

## 포인트

- 개발 중 임베드: web-host에서 원격 `import("http://<WIDGET_HOST>:5101|5201/src/embed.ts")` (Babylon 5101, Three 5201)
- CORS: 각 3d-widget의 `vite.config.ts` 에서 `server.cors = true`
