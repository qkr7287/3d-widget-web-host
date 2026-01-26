import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { DEV_SERVER_HOST, PORT_COMBINED_APP } from "../../config/dev-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    // 기본값: LAN(다른 기기)에서 http://192.168.x.x:6100 로 접속 가능
    host: DEV_SERVER_HOST,
    port: PORT_COMBINED_APP,
    strictPort: true,
    // combined-app에서 3d-widget의 src/asset을 로컬 import/@fs로 읽어올 수 있게 허용
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
  preview: {
    host: DEV_SERVER_HOST,
    port: PORT_COMBINED_APP,
    strictPort: true,
  },
});

