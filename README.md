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

- `apps/babylon/3d-widget` (기본 포트 5174) — Babylon.js 위젯, `mountBabylon(canvas)` export
- `apps/babylon/web-host` (기본 포트 5173) — 호스트 웹앱, 원격 위젯 import
- `apps/babylon/combined-app` (기본 포트 6100) — 로컬 import 결합 앱(로딩타임 비교용)

**Three.js** (`apps/three/`)

- `apps/three/3d-widget` (기본 포트 5176) — Three.js 위젯, 동일 API `mountBabylon(canvas)` export
- `apps/three/web-host` (기본 포트 5175) — 호스트 웹앱
- `apps/three/combined-app` (기본 포트 6101) — 로컬 import 결합 앱

## 실행

```bash
npm install
# Babylon (기본)
npm run dev
# Three.js
npm run dev:three
```

- **Babylon** Host: `http://localhost:5173`, Widget: `http://localhost:5174`, Combined: `http://localhost:6100`
- **Three.js** Host: `http://localhost:5175`, Widget: `http://localhost:5176`, Combined: `http://localhost:6101`

## 포트/호스트/위젯 주소를 쉽게 바꾸는 법(중요)

**루트 `config/dev-config.ts` 한 파일만 수정**하면 3개 앱의 포트/호스트와 web-host가 가져올 위젯 기본 주소가 같이 바뀝니다.

## 포인트

- 개발 중 임베드: web-host에서 원격 `import("http://<WIDGET_HOST>:5174|5176/src/embed.ts")` (Babylon 5174, Three 5176)
- CORS: 각 3d-widget의 `vite.config.ts` 에서 `server.cors = true`
