import { defineConfig } from "vite";
import { DEV_SERVER_HOST, PORT_WEB_HOST, WIDGET_EMBED_URL_OVERRIDE, WIDGET_HOST, WIDGET_PROTOCOL, WIDGET_PUBLIC_PORT } from "../../config/dev-config";

export default defineConfig(({ mode }) => ({
  server: {
    // 기본값: LAN(다른 기기)에서 http://192.168.x.x:5173 로 접속 가능
    host: DEV_SERVER_HOST,
    port: PORT_WEB_HOST,
    strictPort: true,
  },
  preview: {
    host: DEV_SERVER_HOST,
    port: PORT_WEB_HOST,
    strictPort: true,
  },
  // 클라이언트 코드(웹)에서 위젯 주소를 쉽게 만들 수 있도록 빌드 타임 상수 주입
  define: {
    __WIDGET_PROTOCOL__: JSON.stringify(WIDGET_PROTOCOL),
    __WIDGET_HOST__: JSON.stringify(WIDGET_HOST),
    __WIDGET_PORT__: JSON.stringify(WIDGET_PUBLIC_PORT),
    __WIDGET_EMBED_URL_OVERRIDE__: JSON.stringify(WIDGET_EMBED_URL_OVERRIDE),
    __MODE__: JSON.stringify(mode),
  },
}));

