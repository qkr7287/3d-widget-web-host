# 운영 배포 시나리오 (Production deployment)

이 문서는 이 레포의 “원격 ESM 임베드” 구조를 **운영 환경**에서 배포/운영하는 방법을 정리합니다.

## 목표 구조

- **Widget 서비스(정적 파일)**: `embed.js`(및 관련 asset)를 CDN/정적 서버에서 제공
- **Host 서비스(웹 앱)**: 런타임에 `embed.js`를 **원격 import**해서 `<canvas>`에 렌더링

운영에서는 TS 소스(`src/embed.ts`)를 직접 가져오지 않고, **빌드 산출물 JS**를 가져오는 것을 권장합니다.

## 1) Widget(3d-widget) 운영 빌드 만들기

루트에서:

```bash
npm run build
```

결과:

- `apps/3d-widget/dist/embed.js` 생성
  - Host가 운영에서 고정 URL로 import 하기 위한 엔트리 파일
- `apps/3d-widget/dist/assets/*` 생성

> 이 레포는 `apps/3d-widget/vite.config.ts`에서 `embed` 엔트리를 추가하고, `embed.js` 파일명을 고정하도록 설정되어 있습니다.

## 2) Widget 산출물을 정적 호스팅하기

권장 배포 방식:

- `apps/3d-widget/dist/` 전체를 CDN/정적 서버에 업로드
- 외부에서 아래와 같이 접근 가능해야 함:
  - `https://cdn.example.com/widget/embed.js`
  - `https://cdn.example.com/widget/assets/...`

## 3) CORS 설정(필수)

Host와 Widget의 Origin이 다르면(대부분 다름) 브라우저가 cross-origin import를 수행하므로 **CORS 헤더**가 필요합니다.

Widget 정적 서버 응답 헤더 예시:

- `Access-Control-Allow-Origin: https://host.example.com`
- (필요 시) `Vary: Origin`

빠른 테스트는 `*`로도 가능하지만, 운영에서는 가능한 **허용 Origin을 제한**하세요.

## 4) Host에서 Widget URL 연결하기

이 레포 Host(`apps/web-host`)는 원격 위젯 URL을 아래 우선순위로 결정합니다.

1. 쿼리스트링 `?widget=...` (임시 테스트)
2. `VITE_WIDGET_EMBED_URL` (운영 배포 시 권장)
3. 모드별 기본값
   - dev: `http://localhost:5174/src/embed.ts`
   - prod: `http://localhost:5174/embed.js`

운영 권장:

- Host 빌드/배포 파이프라인에서 `VITE_WIDGET_EMBED_URL=https://cdn.example.com/widget/embed.js`를 주입
- 코드 변경 없이 URL만 교체

예시 파일:

- `apps/web-host/env.example`

## 5) CSP(콘텐츠 보안 정책) 주의

Host에 CSP가 적용되어 있다면, 원격 모듈을 로드할 수 있도록 정책을 조정해야 합니다.

- `script-src`에 Widget 도메인 추가 필요 가능
- `connect-src`는 fetch/websocket 등에 영향 (환경에 따라 필요)

CSP는 조직/서비스별 표준이 다르므로, 실제 운영 CSP에 맞춰 최소 권한으로 열어주세요.

## 6) 버전/캐시 전략(운영에서 중요)

운영에서 “항상 같은 URL”을 쓰면 캐시로 인해 교체가 늦게 반영될 수 있습니다.

권장 옵션:

- **버전 경로**: `/widget/v1/embed.js`, `/widget/v2/embed.js`
- **쿼리 버전**: `/widget/embed.js?v=20260121`

또는 CDN 캐시 정책으로 `embed.js`의 캐시 TTL을 짧게 가져가고, asset은 길게 가져가는 방식도 가능합니다.

## 7) 로컬에서 운영 시나리오 시뮬레이션

이 레포는 로컬에서 운영과 유사하게 테스트할 수 있도록 루트에 `preview` 스크립트를 제공합니다.

```bash
npm run preview
```

동작:

- 두 앱을 모두 `build` 한 뒤
- 각각 `vite preview`로 정적 서빙 형태로 실행

## 체크리스트(문제 발생 시)

- **404**: `embed.js`/`assets` 경로가 실제로 공개되어 있는지
- **CORS 오류**: Widget 서버가 `Access-Control-Allow-Origin`을 내려주는지
- **CSP 차단**: Host의 `script-src`가 원격 도메인을 허용하는지
- **dispose 누락**: 재연결/페이지 전환에서 리소스가 누수되지 않는지(반드시 `dispose()` 호출)

