import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export type BabylonWidgetController = {
  engine: Engine;
  scene: Scene;
  dispose: () => void;
};

export function mountBabylon(canvas: HTMLCanvasElement): BabylonWidgetController {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color3(0.03, 0.04, 0.07).toColor4(1);

  const camera = new ArcRotateCamera("camera", -Math.PI / 2.2, Math.PI / 2.6, 6, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.wheelDeltaPercentage = 0.01;

  new HemisphericLight("light", new Vector3(0.2, 1, 0.1), scene);

  const ground = MeshBuilder.CreateGround("ground", { width: 12, height: 12 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.09, 0.11, 0.16);
  groundMat.specularColor = new Color3(0, 0, 0);
  ground.material = groundMat;

  const box = MeshBuilder.CreateBox("box", { size: 1.6 }, scene);
  box.position.y = 0.9;

  const boxMat = new StandardMaterial("boxMat", scene);
  boxMat.diffuseColor = new Color3(0.26, 0.76, 0.62);
  boxMat.specularColor = new Color3(0.4, 0.4, 0.4);
  box.material = boxMat;

  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    box.rotation.y += dt * 0.9;
    box.rotation.x += dt * 0.55;
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize, { passive: true });

  return {
    engine,
    scene,
    dispose: () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      engine.dispose();
    },
  };
}

