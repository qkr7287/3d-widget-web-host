import "./style.css";

type RemoteWidgetModule = {
  mountBabylon: (canvas: HTMLCanvasElement) => { dispose: () => void };
};

const REMOTE_EMBED_URL = "http://localhost:5174/src/embed.ts";

const btnConnect = document.getElementById("btn-connect") as HTMLButtonElement;
const btnDisconnect = document.getElementById("btn-disconnect") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

function setStatus(text: string, kind: "info" | "error" = "info") {
  statusEl.textContent = text;
  statusEl.classList.toggle("status--error", kind === "error");
}

let controller: { dispose: () => void } | null = null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function connectOnce() {
  try {
    setStatus("원격 3D 위젯 로딩 중...");
    btnConnect.disabled = true;

    // 중요: Vite가 빌드 타임에 URL을 해석하려고 하지 않도록 @vite-ignore 사용
    const mod = (await import(/* @vite-ignore */ REMOTE_EMBED_URL)) as RemoteWidgetModule;

    controller = mod.mountBabylon(canvas);
    btnDisconnect.disabled = false;
    setStatus(`임베드 성공: ${REMOTE_EMBED_URL}`);
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

