import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import modelUrl from "../asset/free_cyberpunk_hovercar.glb?url";
import envMapUrl from "../asset/royal_esplanade_2k.hdr?url";

export type ThreeWidgetController = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
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
  const modelUrlResolved = base
    ? `${base.replace(/\/$/, "")}/free_cyberpunk_hovercar.glb`
    : new URL(modelUrl, import.meta.url).href;
  const envMapUrlResolved = base
    ? `${base.replace(/\/$/, "")}/royal_esplanade_2k.hdr`
    : new URL(envMapUrl, import.meta.url).href;

  const getCanvasSize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    return { w, h };
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.08, 0.1, 0.12);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  {
    const { w, h } = getCanvasSize();
    renderer.setSize(w, h);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const { w: initialW, h: initialH } = getCanvasSize();
  const camera = new THREE.PerspectiveCamera(50, initialW / initialH, 0.1, 100);
  const DEFAULT_CAMERA_DISTANCE = 12;
  camera.position.set(0, 0, DEFAULT_CAMERA_DISTANCE);

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

  // 렌더/리사이즈 자체가 정상인지 확인용(모델 로드 전 플레이스홀더)
  const placeholderRoot = new THREE.Group();
  scene.add(placeholderRoot);
  const placeholderSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x7c9cff, metalness: 0.15, roughness: 0.55 }),
  );
  placeholderSphere.position.set(0, 0.6, 0);
  placeholderSphere.castShadow = true;
  placeholderSphere.receiveShadow = true;
  placeholderRoot.add(placeholderSphere);
  const placeholderGround = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, metalness: 0, roughness: 1 }),
  );
  placeholderGround.rotation.x = -Math.PI / 2;
  placeholderGround.receiveShadow = true;
  placeholderRoot.add(placeholderGround);

  let disposed = false;
  let animationId = 0;
  let mixer: THREE.AnimationMixer | null = null;
  const clock = new THREE.Clock();

  const ready = (async () => {
    try {
      const gltf = await new GLTFLoader().loadAsync(modelUrlResolved);
      if (disposed) return;

      // HDR 환경맵은 실패해도 모델 렌더가 되도록 분리 처리
      try {
        const rgbeLoader = new RGBELoader();
        rgbeLoader.setDataType(THREE.HalfFloatType);
        const envTexture = await rgbeLoader.loadAsync(envMapUrlResolved);
        if (!disposed && envTexture && (envTexture as unknown as { image?: unknown }).image) {
          const pmremGenerator = new THREE.PMREMGenerator(renderer);
          pmremGenerator.compileEquirectangularShader();
          try {
            const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
            scene.environment = envMap;
            scene.background = envMap;
          } finally {
            envTexture.dispose();
            pmremGenerator.dispose();
          }
        }
      } catch (e) {
        console.warn("[three-widget] env hdr load/pmrem failed, fallback to solid background", e);
      }

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

      const { center } = computeBounds(loaded);
      modelRoot.position.sub(center);
      controls.target.set(0, 0, 0);
      camera.position.set(0, 2, DEFAULT_CAMERA_DISTANCE);
      camera.near = 0.1;
      camera.far = 2000;
      camera.updateProjectionMatrix();

      await waitFrames(8);

      // ready 이후에 플레이스홀더 제거(검은 화면처럼 보이는 상황 방지)
      placeholderRoot.removeFromParent();
    } catch (e) {
      const mat = placeholderSphere.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0xff6b6b);
      console.error("[three-widget] load failed", e);
      throw e;
    }
  })();

  const onResize = () => {
    const { w, h } = getCanvasSize();
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
    renderer,
    camera,
    scene,
    ready,
    dispose: () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      mixer = null;
      controls.dispose();
      placeholderSphere.geometry.dispose();
      (placeholderSphere.material as THREE.Material).dispose();
      placeholderGround.geometry.dispose();
      (placeholderGround.material as THREE.Material).dispose();
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
