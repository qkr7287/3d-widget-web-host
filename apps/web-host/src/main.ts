import "./style.css";

type RemoteWidgetModule = {
  mountBabylon: (canvas: HTMLCanvasElement) => { dispose: () => void; ready: Promise<void> };
};

const DEFAULT_DEV_EMBED_URL = "http://localhost:5174/src/embed.ts";
const DEFAULT_PROD_EMBED_URL = "http://localhost:5174/embed.js";

/**
 * 원격 위젯 URL 결정 우선순위:
 * 1) 쿼리스트링 ?widget=... (빠른 테스트/임시 교체)
 * 2) 환경변수 VITE_WIDGET_EMBED_URL (dev/prod 빌드별 설정)
 * 3) 모드별 기본값(dev: src/embed.ts, prod: embed.js)
 */
const REMOTE_EMBED_URL =
  new URLSearchParams(window.location.search).get("widget") ??
  import.meta.env.VITE_WIDGET_EMBED_URL ??
  (import.meta.env.DEV ? DEFAULT_DEV_EMBED_URL : DEFAULT_PROD_EMBED_URL);

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

async function connectOnce() {
  try {
    setStatus("원격 3D 위젯 로딩 중...(모듈 import)");
    btnConnect.disabled = true;

    // 중요: Vite가 빌드 타임에 URL을 해석하려고 하지 않도록 @vite-ignore 사용
    const mod = (await import(/* @vite-ignore */ REMOTE_EMBED_URL)) as RemoteWidgetModule;

    const pageStart = getPageStartNow();
    const mounted = mod.mountBabylon(canvas);
    controller = { dispose: mounted.dispose };
    readyPromise = mounted.ready;
    btnDisconnect.disabled = false;
    setStatus(`임베드 성공: ${REMOTE_EMBED_URL}\n3D 준비 중...(GLB 로드 + scene 안정화)`);

    await readyPromise;
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

