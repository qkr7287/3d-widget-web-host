import "./style.css";

type RemoteWidgetModule = {
  mountBabylon: (canvas: HTMLCanvasElement) => { dispose: () => void; ready: Promise<void> };
};

/**
 * "원격 위젯 주소"를 수정하기 쉽게 "루트 config/dev-config.ts" 기반으로 구성.
 * (vite.config.ts에서 __WIDGET_* 상수로 주입)
 */
const WIDGET_PROTOCOL = __WIDGET_PROTOCOL__ || "http";
const WIDGET_HOST = __WIDGET_HOST__ || window.location.hostname || "localhost";
const WIDGET_PORT = Number(__WIDGET_PORT__ || 5174);

const DEFAULT_DEV_EMBED_URL = `${WIDGET_PROTOCOL}://${WIDGET_HOST}:${WIDGET_PORT}/src/embed.ts`;
const DEFAULT_PROD_EMBED_URL = `${WIDGET_PROTOCOL}://${WIDGET_HOST}:${WIDGET_PORT}/embed.js`;

/**
 * 원격 위젯 URL 결정 우선순위:
 * 1) 쿼리스트링 ?widget=... (빠른 테스트/임시 교체)
 * 2) dev-config.ts의 WIDGET_EMBED_URL_OVERRIDE (옵션)
 * 3) 모드별 기본값(dev: src/embed.ts, prod: embed.js)
 */
const WIDGET_OVERRIDE_URL = (__WIDGET_EMBED_URL_OVERRIDE__ ?? "").trim();
const REMOTE_EMBED_URL =
  new URLSearchParams(window.location.search).get("widget") ??
  (WIDGET_OVERRIDE_URL || (import.meta.env.DEV ? DEFAULT_DEV_EMBED_URL : DEFAULT_PROD_EMBED_URL));

const btnConnect = document.getElementById("btn-connect") as HTMLButtonElement;
const btnDisconnect = document.getElementById("btn-disconnect") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const remoteUrlEl = document.getElementById("remote-url") as HTMLSpanElement | null;

if (remoteUrlEl) {
  remoteUrlEl.textContent = REMOTE_EMBED_URL;
}

function setStatus(text: string, kind: "info" | "error" = "info") {
  statusEl.textContent = text;
  statusEl.classList.toggle("status--error", kind === "error");
}

let controller: { dispose: () => void } | null = null;
let readyPromise: Promise<void> | null = null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getPageStartNow() {
  const anyWindow = window as unknown as { __PAGE_START?: number };
  return typeof anyWindow.__PAGE_START === "number" ? anyWindow.__PAGE_START : performance.now();
}

function recordStep(stepIndex: number): void {
  const elapsed = Math.round(performance.now() - getPageStartNow());
  const el = document.getElementById(`step-${stepIndex}`);
  if (!el) return;
  const msSpan = el.querySelector(".loadTimeline__ms");
  if (msSpan) msSpan.textContent = `${elapsed} ms`;
  el.classList.add("loadTimeline__step--done");
}

function resetTimeline(): void {
  // 2~6만 초기화. 1(host 앱 로드)은 페이지 로드 시 한 번만 기록되어 유지.
  for (let i = 2; i <= 6; i += 1) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    el.classList.remove("loadTimeline__step--done");
    const msSpan = el.querySelector(".loadTimeline__ms");
    if (msSpan) msSpan.textContent = "—";
  }
}

// 1. host 앱 로드 완료 시점 기록 (main.ts·style·Vite 청크 실행 직후)
recordStep(1);

async function connectOnce() {
  try {
    setStatus("원격 3D 위젯 로딩 중...(모듈 import)");
    btnConnect.disabled = true;

    // 2. 자동 연결 시작
    recordStep(2);

    // 중요: Vite가 빌드 타임에 URL을 해석하려고 하지 않도록 @vite-ignore 사용
    const mod = (await import(/* @vite-ignore */ REMOTE_EMBED_URL)) as RemoteWidgetModule;

    // 3·4. 원격 모듈 로드 완료 (embed + 의존성 동시 완료)
    recordStep(3);
    recordStep(4);

    // prod 빌드(embed.js)가 named export를 보존하지 못하는 환경에서도 동작하도록 global fallback 지원
    const globalMount =
      (globalThis as unknown as { __3D_WIDGET__?: { mountBabylon?: RemoteWidgetModule["mountBabylon"] } }).__3D_WIDGET__
        ?.mountBabylon;
    const mount = typeof mod.mountBabylon === "function" ? mod.mountBabylon : globalMount;
    if (typeof mount !== "function") {
      throw new Error(
        `mountBabylon을 찾을 수 없습니다. embed.js가 ESM export를 제공하지 않을 수 있습니다. (REMOTE_EMBED_URL=${REMOTE_EMBED_URL})`,
      );
    }

    const pageStart = getPageStartNow();
    const mounted = mount(canvas);

    // 5. mount 실행 완료 (GLB·env 요청 시작됨)
    recordStep(5);

    controller = { dispose: mounted.dispose };
    readyPromise = mounted.ready;
    btnDisconnect.disabled = false;
    setStatus(`임베드 성공: ${REMOTE_EMBED_URL}\n3D 준비 중...(GLB 로드 + scene 안정화)`);

    await readyPromise;

    // 6. ready 종료 (프레임 안정화 완료)
    recordStep(6);

    const ms = performance.now() - pageStart;
    setStatus(`로딩 완료(안정화): ${ms.toFixed(0)} ms\n(기준: 웹 진입 순간 → GLB 로드 + scene ready + 프레임 안정화)`);
  } catch (e) {
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    setStatus(
      `임베드 실패 (대부분 CORS/포트/원격 서버 미실행): ${e instanceof Error ? e.message : String(e)}`,
      "error",
    );
  }
}

async function connectWithRetry() {
  // 동시에 두 dev 서버를 띄우면 host가 먼저 올라오면서 5174가 아직 준비 전인 경우가 있어 재시도
  const delays = [0, 400, 800, 1400];
  for (let i = 0; i < delays.length; i += 1) {
    if (controller) return;
    if (delays[i] > 0) {
      setStatus(`원격 위젯 대기 중... (${i + 1}/${delays.length})`);
      await sleep(delays[i]);
    }
    await connectOnce();
    if (controller) return;
  }
}

function disconnect() {
  try {
    controller?.dispose();
  } finally {
    controller = null;
    readyPromise = null;
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    setStatus("해제 완료(Dispose). 다시 연결을 눌러주세요.");
    resetTimeline();
  }
}

btnConnect.addEventListener("click", () => {
  void connectWithRetry();
});

btnDisconnect.addEventListener("click", () => {
  disconnect();
});

// 페이지 로드 후 자동 연결(원하면 주석 처리)
void connectWithRetry();

