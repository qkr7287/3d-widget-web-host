import "./style.css";

// 로컬 결합 앱(5202): 원격 import 없이 Three.js 3d-widget 소스를 직접 import해서 실행
import { mountThree } from "@apps/three-3d-widget/embed";

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

function recordStep(stepIndex: number): void {
  const elapsed = Math.round(performance.now() - getPageStartNow());
  const el = document.getElementById(`step-${stepIndex}`);
  if (!el) return;
  const msSpan = el.querySelector(".loadTimeline__ms");
  if (msSpan) msSpan.textContent = `${elapsed} ms`;
  el.classList.add("loadTimeline__step--done");
}

function resetTimeline(): void {
  for (let i = 2; i <= 4; i += 1) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    el.classList.remove("loadTimeline__step--done");
    const msSpan = el.querySelector(".loadTimeline__ms");
    if (msSpan) msSpan.textContent = "—";
  }
}

// 1. host 앱 로드 완료 시점
recordStep(1);

let controller: { dispose: () => void; ready: Promise<void> } | null = null;

async function mount() {
  try {
    btnMount.disabled = true;
    setStatus("3D 초기화 중...(로컬 import)\nGLB 로드 + scene 안정화 대기...");

    recordStep(2);
    const pageStart = getPageStartNow();
    controller = mountThree(canvas, { assetsBase: "/widget-asset/" });
    recordStep(3);
    btnUnmount.disabled = false;

    await controller.ready;
    recordStep(4);
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
    resetTimeline();
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

