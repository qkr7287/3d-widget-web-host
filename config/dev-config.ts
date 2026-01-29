/// <reference types="node" />
/**
 * 개발/테스트용 공통 설정(한 곳에서만 수정)
 *
 * - 포트/호스트를 바꾸고 싶으면 이 파일만 수정하세요.
 * - Docker Compose 사용 시 env_file(.env.full, .env.webhost) 값이 우선합니다.
 * - web-host가 원격 widget을 가져오는 주소도 여기 값으로 기본값이 결정됩니다.
 */

function parseDevServerHost(): true | string {
  const raw = process.env.DEV_SERVER_HOST;
  if (raw === "true" || raw === "1") return true;
  if (raw) return raw;
  return true;
}

/**
 * Vite dev 서버 바인딩
 * - true: 0.0.0.0 (LAN/다른 기기에서 접속 가능)
 * - "127.0.0.1": 로컬만
 * - "192.168.0.47": 특정 인터페이스에만 바인딩
 */
export const DEV_SERVER_HOST: true | string = parseDevServerHost();

/** 각 앱 dev 서버 포트 */
export const PORT_WEB_HOST = Number(process.env.PORT_WEB_HOST) || 5173;
export const PORT_3D_WIDGET = Number(process.env.PORT_3D_WIDGET) || 5174;

// NOTE: 6000은 Chromium(Chrome/Edge)에서 ERR_UNSAFE_PORT로 차단되는 경우가 있어 6100 권장
export const PORT_COMBINED_APP = Number(process.env.PORT_COMBINED_APP) || 6100;

/**
 * web-host가 3d-widget을 가져올 때 사용할 기본 주소 구성요소
 * - WIDGET_HOST가 빈 문자열이면: 현재 접속 host(window.location.hostname)를 사용
 * - Docker Compose webhost-only: "full" (같은 compose 내 full 서비스 호스트명)
 */
export const WIDGET_PROTOCOL = process.env.WIDGET_PROTOCOL || "http";
export const WIDGET_HOST = process.env.WIDGET_HOST ?? "";

/**
 * (옵션) 원격 모듈 URL을 통째로 고정하고 싶을 때 사용
 * - 빈 문자열이면 기본 규칙(DEV: /src/embed.ts, PROD: /embed.js)
 */
export const WIDGET_EMBED_URL_OVERRIDE = process.env.WIDGET_EMBED_URL_OVERRIDE ?? "";
