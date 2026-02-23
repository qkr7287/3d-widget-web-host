import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

// apps/babylon/3d-widget/asset/royal_esplanade_2k.hdr — Vite ?url로 번들 시점 URL 확정
import envMapUrl from "../asset/royal_esplanade_2k.hdr?url";

export type BabylonWidgetController = {
  engine: BABYLON.Engine;
  scene: BABYLON.Scene;
  /**
   * "웹 진입 → 모델 로드 → 씬/리소스 준비 → 몇 프레임 렌더 안정화"까지 완료되는 시점
   * (호스트에서 로딩타임 측정용)
   */
  ready: Promise<void>;
  dispose: () => void;
};

type WidgetGlobal = {
  mountBabylon?: typeof mountBabylon;
};

function registerGlobalMount() {
  const g = globalThis as unknown as { __3D_WIDGET__?: WidgetGlobal };
  if (!g.__3D_WIDGET__) g.__3D_WIDGET__ = {};
  g.__3D_WIDGET__.mountBabylon = mountBabylon;
}

function computeWorldBounds(meshes: BABYLON.AbstractMesh[]) {
  let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (const m of meshes) {
    if (!m.isEnabled()) continue;
    const bi = m.getBoundingInfo?.();
    const bb = bi?.boundingBox;
    if (!bb) continue;
    const bMin = bb.minimumWorld;
    const bMax = bb.maximumWorld;
    if (
      !Number.isFinite(bMin.x) ||
      !Number.isFinite(bMin.y) ||
      !Number.isFinite(bMin.z) ||
      !Number.isFinite(bMax.x) ||
      !Number.isFinite(bMax.y) ||
      !Number.isFinite(bMax.z)
    ) {
      continue;
    }
    min = BABYLON.Vector3.Minimize(min, bMin);
    max = BABYLON.Vector3.Maximize(max, bMax);
  }

  if (!Number.isFinite(min.x) || !Number.isFinite(max.x)) {
    // fallback
    min = new BABYLON.Vector3(-1, -1, -1);
    max = new BABYLON.Vector3(1, 1, 1);
  }

  const center = min.add(max).scale(0.5);
  const radius = max.subtract(min).length() * 0.5;
  return { min, max, center, radius: Math.max(radius, 0.01) };
}

function waitFrames(scene: BABYLON.Scene, frameCount: number) {
  return new Promise<void>((resolve) => {
    let frames = 0;
    const token = scene.onAfterRenderObservable.add(() => {
      frames += 1;
      if (frames >= frameCount) {
        scene.onAfterRenderObservable.remove(token);
        resolve();
      }
    });
  });
}

export function mountBabylon(canvas: HTMLCanvasElement): BabylonWidgetController {
  const engine = new BABYLON.Engine(canvas, true, {
    antialias: true,
    preserveDrawingBuffer: false,
    stencil: false,
    adaptToDeviceRatio: true,
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.05, 1);

  const resizeToCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w > 0 && h > 0) {
      engine.setSize(w, h, true);
    } else {
      engine.resize();
    }
  };
  const resizeObserver = new ResizeObserver(() => resizeToCanvas());
  resizeObserver.observe(canvas);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2.3,
    Math.PI / 2.6,
    6,
    BABYLON.Vector3.Zero(),
    scene,
  );
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;
  camera.minZ = 0.01;
  camera.maxZ = 10000;
  resizeToCanvas();
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 1400;
  camera.lowerRadiusLimit = 1.0;
  camera.upperRadiusLimit = 80;

  // 기본 주변광(너무 플랫해지지 않게 약하게)
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.1, 1, 0.2), scene);
  hemi.intensity = 0.65;
  hemi.groundColor = new BABYLON.Color3(0.05, 0.06, 0.08);

  // 모델 로드 전에도 렌더가 되는지 확인용(임베드 환경에서 "검은 화면" 방지)
  const placeholderRoot = new BABYLON.TransformNode("placeholderRoot", scene);
  const placeholderSphere = BABYLON.MeshBuilder.CreateSphere("placeholderSphere", { diameter: 1.2 }, scene);
  placeholderSphere.parent = placeholderRoot;
  placeholderSphere.position.y = 0.6;
  const placeholderGround = BABYLON.MeshBuilder.CreateGround("placeholderGround", { width: 8, height: 8 }, scene);
  placeholderGround.parent = placeholderRoot;
  placeholderGround.receiveShadows = true;

  // 키 라이트 + 그림자(“이쁘게”의 핵심)
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.6, -1, -0.3), scene);
  sun.position = new BABYLON.Vector3(12, 18, 10);
  sun.intensity = 3.0;

  const shadows = new BABYLON.ShadowGenerator(2048, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 48;
  shadows.bias = 0.0004;
  shadows.normalBias = 0.02;

  // PBR 환경(환경맵) + 이미지 프로세싱(ACES 톤매핑)
  // - GLB가 PBR 머티리얼인 경우, environmentTexture 유무가 “이쁘게”에 큰 영향
  const envUrlResolved = new URL(envMapUrl, import.meta.url).href;
  scene.environmentTexture = new BABYLON.HDRCubeTexture(envUrlResolved, scene, 512, false, true, false, true);
  const skybox = scene.createDefaultSkybox(scene.environmentTexture, true, 50000, 0);
  if (skybox) {
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
  }
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.15;
  scene.imageProcessingConfiguration.contrast = 1.25;

  // 후처리 파이프라인(FXAA + Bloom)
  const pipeline = new BABYLON.DefaultRenderingPipeline("pipeline", true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.75;
  pipeline.bloomWeight = 0.2;
  pipeline.bloomKernel = 64;

  const assetBaseUrl = new URL(/* @vite-ignore */ "../asset/", import.meta.url).href;
  const modelFileName = "free_cyberpunk_hovercar.glb";

  // 모델 루트 노드(회전/스케일 등 제어용)
  const modelRoot = new BABYLON.TransformNode("modelRoot", scene);
  let loadedMeshes: BABYLON.AbstractMesh[] = [];
  let disposed = false;

  // 로딩은 비동기: 첫 프레임부터 씬은 돌고, 로드 완료 후 프레이밍/그림자 설정
  const ready = (async () => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(null, assetBaseUrl, modelFileName, scene);
    if (disposed) return;
    loadedMeshes = result.meshes;

    // 로드된 메쉬들을 한 루트 아래로 정리
    for (const m of loadedMeshes) {
      if (m.parent == null) m.parent = modelRoot;
      m.receiveShadows = true;
      // 그림자 캐스터는 Mesh에만 추가(TransformNode 등 제외)
      if (m instanceof BABYLON.Mesh) {
        shadows.addShadowCaster(m, true);
      }
    }

    const drawable = loadedMeshes.filter((m) => (m instanceof BABYLON.Mesh ? m.getTotalVertices() > 0 : false));
    const { center, radius } = computeWorldBounds(drawable);
    camera.setTarget(center);
    camera.radius = radius * 2.2;
    camera.lowerRadiusLimit = radius * 0.8;
    camera.upperRadiusLimit = radius * 8;

    // 살짝 보기 좋은 각도
    camera.alpha = -Math.PI / 2.2;
    camera.beta = Math.PI / 2.55;
    // 그림자 영역(모델 크기에 맞춰 튜닝)
    shadows.getShadowMap()?.renderList?.length; // ensure map created
    shadows.setDarkness(0.3);

    // 씬 리소스(텍스처/셰이더 등) 준비까지 대기 + 몇 프레임 렌더링 안정화
    await scene.whenReadyAsync();
    if (disposed) return;
    await waitFrames(scene, 8);

    // ready 이후에 플레이스홀더 제거(모델이 안 보이는 상황에서도 "완전 빈 화면" 방지)
    placeholderRoot.dispose(false, true);
  })();

  // 모델이 로드되면 은근히 돌아가게(멋내기)
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    if (loadedMeshes.length > 0) {
      modelRoot.rotation.y += dt * 0.15;
    }
  });

  engine.runRenderLoop(() => {
    if (engine.getRenderWidth() === 0 || engine.getRenderHeight() === 0) {
      resizeToCanvas();
    }
    scene.render();
  });

  const onResize = () => resizeToCanvas();
  window.addEventListener("resize", onResize, { passive: true });

  return {
    engine,
    scene,
    ready,
    dispose: () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      pipeline.dispose();
      shadows.dispose();
      placeholderRoot.dispose(false, true);
      modelRoot.dispose(false, true);
      scene.dispose();
      engine.dispose();
    },
  };
}

// 운영 빌드(embed.js)가 named export를 보존하지 못하는 환경에서도 host가 접근할 수 있도록 global에 등록
registerGlobalMount();
