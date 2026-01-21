# 3d-widget-web-host

## 3D 임베드 테스트 (Vite + Babylon) - 모노레포

이 저장소는 **3D 위젯(서버 A)** 과 **위젯을 임베드하는 호스트 웹(서버 B)** 을 분리해서,
개발/배포 관점에서 “원격 모듈 임베드” 흐름을 테스트하기 위한 예시입니다.

## 문서

- 작동 방식: `docs/how-it-works.md`
- 다른 프로젝트 적용 가이드: `docs/integration-guide.md`

## 앱 구성

- `apps/3d-widget` (포트 5174)
  - Babylon.js 위젯
  - `src/embed.ts` 에 `mountBabylon(canvas)` 를 export
- `apps/web-host` (포트 5173)
  - 호스트 웹앱
  - `http://localhost:5174/src/embed.ts` 를 원격 import 해서 캔버스에 mount

## 실행

```bash
npm install
npm run dev
```

- Host: `http://localhost:5173`
- Widget(standalone): `http://localhost:5174`

## 포인트

- 개발 중 임베드: `apps/web-host`에서 `import("http://localhost:5174/src/embed.ts")`
- CORS: `apps/3d-widget/vite.config.ts` 에서 `server.cors = true`
