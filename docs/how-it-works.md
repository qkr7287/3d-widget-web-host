# 작동 방식 (How it works)

이 문서는 이 레포가 **“원격 ESM 모듈을 동적으로 import 해서 3D 위젯을 임베드하는 방식”** 으로 동작하는 과정을 설명합니다.

## 구성요소(2개의 Vite 앱)

- **3D 위젯 앱**: `apps/3d-widget` (dev server: `http://localhost:5174`)
  - 브라우저에서 실행되는 Babylon.js 기반 3D 렌더러를 제공합니다.
  - 외부(호스트)가 호출할 수 있도록 `mountBabylon(canvas)` 함수를 export 합니다.
- **호스트 앱**: `apps/web-host` (dev server: `http://localhost:5173`)
  - 사용자 UI(연결/해제 버튼, 상태 표시, `<canvas>`)를 제공하고,
  - 위젯 앱의 모듈을 **원격 URL로 import** 해서 캔버스에 렌더링을 “붙였다/떼는” 역할을 합니다.

## 포트 정리(자주 헷갈리는 부분)

- **Host(웹 호스트)**: `apps/web-host` → `http://localhost:5173`
- **Widget(3D 위젯)**: `apps/3d-widget` → `http://localhost:5174`

즉, 브라우저는 **5173(Host)을 열고**, 그 안에서 원격 모듈을 **5174(Widget)에서 import**합니다.

## 로컬 실행(개발)

루트에서 두 앱을 동시에 실행합니다.

```bash
npm install
npm run dev
```

- Host: `http://localhost:5173`
- Widget(dev): `http://localhost:5174`

루트 `package.json`은 `concurrently`로 두 dev server를 동시에 올립니다.

## 핵심 아이디어: 원격 ESM을 브라우저에서 직접 import

호스트(`apps/web-host`)는 다음 URL을 “원격 모듈 엔드포인트”로 사용합니다.

- `http://localhost:5174/src/embed.ts`

운영 배포 시나리오에서는 위젯을 빌드해서 **고정 URL**로 제공합니다.

- `http://localhost:5174/embed.js` (예: `apps/3d-widget` 빌드 산출물)

여기서 중요한 점:

- Vite는 보통 `import("문자열")`을 빌드 타임에 분석하려고 합니다.
- 이 레포는 `/* @vite-ignore */`를 붙여서 **“이 import는 런타임에 원격 URL로 수행”** 하도록 강제합니다.
- 따라서 실제 로딩은 브라우저가 CORS 정책을 포함해 일반 네트워크 요청으로 처리합니다.

## “embed.ts만 가져오는 게 아니라 의존성도 같이 가져오나?”

네. Host(5173)가 `import()`를 시작하면 브라우저는 `embed.ts`(또는 운영에서는 `embed.js`)를 로드한 뒤,
그 코드가 필요로 하는 의존성(예: `@babylonjs/core`)까지 **추가 네트워크 요청으로 계속 가져옵니다.**

중요 포인트:

- 이때 **응답을 제공하는 서버는 Widget(5174)** 입니다.
- Host(5173)는 “가져오기를 트리거”할 뿐이고, 의존성/청크 제공은 Widget이 담당합니다.

## dev vs build/preview 차이(한 줄 요약)

- **dev**: `src/embed.ts`를 엔트리로, Vite dev server(5174)가 소스/의존성을 **즉석 변환하여** 모듈로 서빙
- **build/preview/운영**: 미리 만들어둔 `dist/embed.js`(+ `dist/assets/*`)를 엔트리로, 정적 파일만 서빙

## 위젯 쪽(5174)에서 실제로 제공하는 API

`apps/3d-widget/src/embed.ts`는 다음을 export 합니다.

- `mountBabylon(canvas: HTMLCanvasElement): BabylonWidgetController`
  - Babylon Engine/Scene을 생성하고 렌더 루프를 실행합니다.
  - `dispose()`를 통해 이벤트/리소스를 정리합니다.

호스트는 `dispose()`만 알면 되도록 “컨트롤러”를 단순화해서 사용합니다.

## 호스트 쪽(5173)에서 연결(임베드) 흐름

호스트(`apps/web-host/src/main.ts`)의 흐름은 요약하면 아래와 같습니다.

1. 페이지 로드(또는 “연결” 버튼 클릭)
2. 원격 URL을 동적 import
3. 가져온 모듈의 `mountBabylon(canvas)` 호출
4. 반환된 컨트롤러를 저장해두고, “해제(Dispose)” 시점에 `dispose()` 호출

추가로, 두 dev server를 동시에 띄울 때 **호스트가 먼저 뜨고 위젯이 늦게 뜨는 상황**을 대비해 간단한 재시도(backoff) 로직이 들어있습니다.

## CORS가 왜 필요한가?

호스트(5173)에서 위젯(5174)의 모듈을 가져오는 것은 **교차 출처(Cross-Origin) 요청**입니다.

- 호스트 Origin: `http://localhost:5173`
- 위젯 Origin: `http://localhost:5174`

따라서 위젯 dev server는 CORS를 허용해야 하며, 이 레포는 `apps/3d-widget/vite.config.ts`에서:

- `server.cors = true`

로 설정되어 있습니다.

운영(정적 서빙) 시나리오를 로컬에서 테스트하기 위해, `vite preview`에서도 CORS 헤더를 추가했습니다.

## 페이지 구성(호스트)

호스트의 `apps/web-host/index.html`에는 다음 요소가 있습니다.

- `<canvas id="renderCanvas"></canvas>`: 위젯이 렌더링하는 타겟
- 상태 표시 영역/버튼: 연결(임베드), 해제(Dispose)

## 정리: 이 레포의 “임베드”란?

이 레포에서 “임베드”는 iframe이 아니라,

- **브라우저에서 원격 ESM 모듈을 import**
- **그 모듈이 제공하는 `mountBabylon(canvas)` 같은 “마운트 함수”를 호출**
- **반환된 컨트롤러로 lifecycle(dispose)를 관리**

하는 패턴입니다.

