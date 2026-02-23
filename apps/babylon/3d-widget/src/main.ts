import "./style.css";
import { mountBabylon } from "./embed";

function createCanvas(id: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.tabIndex = 0;
  document.body.insertBefore(canvas, document.body.firstChild);
  return canvas;
}

const canvas = createCanvas("renderCanvas");
const controller = mountBabylon(canvas);

const hudSub = document.querySelector(".hud__sub") as HTMLDivElement | null;
if (hudSub) {
  hudSub.textContent = "로딩 중...(GLB/HDR)";
}
controller.ready
  .then(() => {
    if (hudSub) hudSub.textContent = "로딩 완료. (임베드는 Host 앱에서 테스트)";
  })
  .catch((e) => {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    if (hudSub) hudSub.textContent = `로딩 실패: ${msg}`;
    console.error("[babylon-standalone] ready failed", e);
  });

