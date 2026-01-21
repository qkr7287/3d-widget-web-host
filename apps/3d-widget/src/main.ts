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
mountBabylon(canvas);

