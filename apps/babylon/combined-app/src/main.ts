import "./style.css";

// 로컬 결합 앱(6000): 원격 import 없이 3d-widget 소스를 직접 import해서 실행
import { mountBabylon } from "../../3d-widget/src/embed";

const btnMount = document.getElementById("btn-mount") as HTMLButtonElement;
const btnUnmount = document.getElementById("btn-unmount") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

function setStatus(text: string, kind: "info" | "error" = "info") {
  statusEl.textContent = text;
  statusEl.classList.toggle("status--error", kind === "error");
}

function getPageStartNow() {
  const anyWindow = window as unknown as { __PAGE_START?: number };
  return typeof anyWindow.__PAGE_START === "number" ? anyWindow.__PAGE_START : performance.now();
}

let controller: { dispose: () => void; ready: Promise<void> } | null = null;

async function mount() {
  try {
    btnMount.disabled = true;
    setStatus("3D 초기화 중...(로컬 import)\nGLB 로드 + scene 안정화 대기...");

    const pageStart = getPageStartNow();
    controller = mountBabylon(canvas);
    btnUnmount.disabled = false;

    await controller.ready;
    const ms = performance.now() - pageStart;
    setStatus(`로딩 완료(안정화): ${ms.toFixed(0)} ms\n(기준: 웹 진입 순간 → GLB 로드 + scene ready + 프레임 안정화)`);
  } catch (e) {
    btnMount.disabled = false;
    btnUnmount.disabled = true;
    controller = null;
    setStatus(e instanceof Error ? e.message : String(e), "error");
  }
}

function unmount() {
  try {
    controller?.dispose();
  } finally {
    controller = null;
    btnMount.disabled = false;
    btnUnmount.disabled = true;
    setStatus("언마운트(Dispose) 완료");
  }
}

btnMount.addEventListener("click", () => {
  void mount();
});

btnUnmount.addEventListener("click", () => {
  unmount();
});

// 자동 측정(원하면 주석 처리)
void mount();

