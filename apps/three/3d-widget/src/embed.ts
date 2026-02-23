import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import modelUrl from "../asset/free_cyberpunk_hovercar.glb?url";
import envMapUrl from "../asset/royal_esplanade_2k.hdr?url";

export type ThreeWidgetController = {
  scene: THREE.Scene;
  ready: Promise<void>;
  dispose: () => void;
};

export type MountThreeOptions = {
  assetsBase?: string;
};

type WidgetGlobal = {
  mountThree?: (canvas: HTMLCanvasElement, options?: MountThreeOptions) => ThreeWidgetController;
};

function registerGlobalMount() {
  const g = globalThis as unknown as { __3D_WIDGET__?: WidgetGlobal };
  if (!g.__3D_WIDGET__) g.__3D_WIDGET__ = {};
  g.__3D_WIDGET__.mountThree = mountThree;
}

function waitFrames(frameCount: number): Promise<void> {
  return new Promise((resolve) => {
    let frames = 0;
    function onFrame() {
      frames += 1;
      if (frames >= frameCount) {
        resolve();
        return;
      }
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);
  });
}

function computeBounds(object: THREE.Object3D): { center: THREE.Vector3; radius: number } {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  return { center, radius: Math.max(radius, 0.01) };
}

export function mountThree(
  canvas: HTMLCanvasElement,
  options?: MountThreeOptions,
): ThreeWidgetController {
  const base = options?.assetsBase ?? "";
  const modelUrlResolved = base ? `${base.replace(/\/$/, "")}/free_cyberpunk_hovercar.glb` : modelUrl;
  const envMapUrlResolved = base ? `${base.replace(/\/$/, "")}/royal_esplanade_2k.hdr` : envMapUrl;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.08, 0.1, 0.12);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1;
  controls.maxDistance = 80;
  controls.target.set(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0x6699cc, 0x0c0f14, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(12, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let disposed = false;
  let animationId = 0;
  let mixer: THREE.AnimationMixer | null = null;
  const clock = new THREE.Clock();

  const ready = (async () => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const [gltf, envTexture] = await Promise.all([
      new GLTFLoader().loadAsync(modelUrlResolved),
      new RGBELoader().loadAsync(envMapUrlResolved),
    ]);
    if (disposed) return;

    const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
    scene.environment = envMap;
    scene.background = envMap;
    envTexture.dispose();
    pmremGenerator.dispose();

    const loaded = gltf.scene;
    loaded.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    modelRoot.add(loaded);

    if (gltf.animations?.length && !disposed) {
      mixer = new THREE.AnimationMixer(loaded);
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      }
    }

    const { center, radius } = computeBounds(loaded);
    controls.target.copy(center);
    const dist = radius * 2.2;
    camera.position.set(center.x, center.y, center.z + dist);
    camera.near = Math.max(0.1, radius * 0.1);
    camera.far = Math.max(100, radius * 20);
    camera.updateProjectionMatrix();

    await waitFrames(8);
  })();

  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
  window.addEventListener("resize", onResize, { passive: true });
  const resizeObserver = new ResizeObserver(() => onResize());
  resizeObserver.observe(canvas);
  onResize();

  function animate() {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    modelRoot.rotation.y += dt * 0.15;
    controls.update();
    renderer.render(scene, camera);
  }
  animationId = requestAnimationFrame(animate);

  return {
    scene,
    ready,
    dispose: () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      mixer = null;
      controls.dispose();
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m: THREE.Material) => m.dispose());
          else obj.material?.dispose();
        }
      });
      renderer.dispose();
    },
  };
}

registerGlobalMount();
