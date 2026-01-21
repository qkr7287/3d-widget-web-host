# 다른 프로젝트에 적용하기 (Integration guide)

이 문서는 이 레포의 패턴(원격 ESM import + `mount(canvas)`/`dispose()` 라이프사이클)을 **다른 프로젝트에 재사용**하는 방법을 정리합니다.

## 전제 조건(중요)

- **브라우저가 원격 모듈을 가져올 수 있어야 함**
  - 원격 서버가 **ESM(JavaScript)로 응답**해야 합니다.
  - dev에서는 `http://localhost:5174/src/embed.ts`처럼 Vite가 TS를 즉석 변환해 서빙해주기 때문에 동작합니다.
- **CORS 허용**
  - 호스트 Origin과 위젯 Origin이 다르면(대부분 다름) 원격 서버가 CORS를 허용해야 합니다.
- **CSP(콘텐츠 보안 정책)**
  - 호스트 사이트에 CSP가 걸려 있다면 `script-src`에서 원격 도메인을 허용해야 합니다.
- **버전/캐시 전략**
  - 원격 모듈 URL을 “고정 경로”로 쓰면 캐시 때문에 교체가 늦게 반영될 수 있습니다.
  - 운영 환경에서는 버전이 포함된 경로(예: `/widget/v1/embed.js`) 또는 쿼리(예: `?v=...`)를 고려하세요.

## 적용 방법 A: “호스트 프로젝트”에 그대로 붙이기(가장 쉬움)

### 1) 호스트 HTML에 캔버스 추가

호스트 페이지에 렌더링 대상 캔버스를 하나 둡니다.

```html
<canvas id="renderCanvas"></canvas>
```

### 2) 호스트 코드에서 원격 모듈을 동적 import

호스트 번들러(Vite 기준)가 원격 URL import를 빌드 타임에 분석하지 않도록 `/* @vite-ignore */`를 유지하는 것이 포인트입니다.

```ts
type RemoteWidgetModule = {
  mountBabylon: (canvas: HTMLCanvasElement) => { dispose: () => void };
};

const REMOTE_EMBED_URL = "http://localhost:5174/src/embed.ts";
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

let controller: { dispose: () => void } | null = null;

export async function connectWidget() {
  const mod = (await import(/* @vite-ignore */ REMOTE_EMBED_URL)) as RemoteWidgetModule;
  controller = mod.mountBabylon(canvas);
}

export function disconnectWidget() {
  controller?.dispose();
  controller = null;
}
```

### 3) UX(권장)

이 레포처럼:

- 연결 중 로딩 상태 표시
- 실패 시 “대부분 CORS/포트/원격 서버 미실행” 같은 원인 힌트 제공
- 원격 서버가 늦게 뜨는 경우 간단 재시도(backoff)

를 넣어두면 운영/개발 모두에서 디버깅이 쉬워집니다.

## 적용 방법 B: “위젯만” 다른 환경에 배포해서 가져오기(운영에 가까움)

개발에서는 `.../src/embed.ts`를 바로 가져와도 되지만, 운영에서는 보통 **빌드 결과물(.js)** 을 정적 호스팅해서 가져오는 형태가 안전합니다.

이 레포는 운영 빌드에서 위젯 쪽 산출물로 **`embed.js`를 고정 생성**하도록 설정되어 있습니다.

### 1) 위젯 앱에서 “진짜 엔트리”를 고정하기

현재 위젯은 `src/embed.ts`에 `mountBabylon(canvas)`가 정의되어 있으니,
운영에서 제공할 엔트리 파일을 `embed.js` 같은 형태로 고정하는 것이 좋습니다.

권장 방향:

- 위젯을 `vite build`로 빌드
- 산출물(`dist/`)을 정적 서버(예: Nginx, S3/CloudFront, 사내 CDN)에 배포
- 호스트는 `https://<cdn>/widget/embed.js` 같은 URL을 import

### 2) 위젯 서버(CDN/정적 서버)에서 CORS 헤더 추가

호스트와 도메인이 다르면 정적 서버에서 다음 헤더를 내려야 합니다(예시).

- `Access-Control-Allow-Origin: https://<host-domain>`
  - 빠른 테스트는 `*`로도 되지만, 운영에서는 가능한 특정 도메인만 허용하세요.

### 3) 호스트에서 원격 URL만 교체

호스트 코드는 동일하고, `REMOTE_EMBED_URL`만 운영 URL로 바꿉니다.

권장: 운영에서는 호스트에 `VITE_WIDGET_EMBED_URL`(Vite env)을 주입해 URL만 바꾸고 코드 변경은 최소화하세요.

참고로 이 레포는 보안상 이유로 `.env*` 파일을 커밋하지 않고, 대신 예시 파일을 제공합니다:

- `apps/web-host/env.example`

## 타입/계약(Contract) 권장

호스트-위젯 사이 계약은 “최소 단위”로 유지하는 게 좋습니다.

- **호스트가 알아야 할 것**: `mount(canvas) -> { dispose() }`
- **위젯 내부 구현**: Babylon 엔진/씬/렌더 루프/이벤트 핸들링 등 자유롭게 변경

이렇게 하면 위젯을 교체해도 호스트 수정이 최소화됩니다.

## 문제 해결 체크리스트

- **CORS 에러**: 위젯 서버가 CORS 허용하는지, 호스트/위젯 포트/도메인이 맞는지 확인
- **404/네트워크 에러**: 원격 URL이 실제로 접근 가능한지 브라우저 네트워크 탭 확인
- **CSP 차단**: `script-src`에서 원격 도메인 허용 여부 확인
- **dispose 누락**: 페이지 전환/재연결 시 엔진/이벤트가 중복되어 성능 저하/버그 발생 가능 → 반드시 `dispose()` 호출

