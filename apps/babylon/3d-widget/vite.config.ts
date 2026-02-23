import { defineConfig } from "vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { DEV_SERVER_HOST, PORT_3D_WIDGET } from "../../../config/dev-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    // 기본값: LAN(다른 기기)에서 http://192.168.x.x:5101 로 접속 가능
    host: DEV_SERVER_HOST,
    port: PORT_3D_WIDGET,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*",
      // HTTPS 페이지에서 사설망(http://192.168.x.x:port) 리소스를 불러올 때 차단되는 케이스 대응(Chrome PNA)
      "Access-Control-Allow-Private-Network": "true",
    },
  },
  preview: {
    host: DEV_SERVER_HOST,
    port: PORT_3D_WIDGET,
    strictPort: true,
    headers: {
      // 운영(정적 서빙) 시나리오를 로컬에서 시뮬레이션할 때도 cross-origin import가 가능하도록
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  },
  build: {
    rollupOptions: {
      // 운영 빌드에서 "standalone 페이지"와 "임베드 모듈 엔트리"를 동시에 생성
      input: {
        main: resolve(__dirname, "index.html"),
        embed: resolve(__dirname, "src/embed.ts"),
      },
      output: {
        // 호스트가 운영에서 고정 URL로 import 할 수 있도록 embed 엔트리 파일명을 고정
        entryFileNames: (chunkInfo) => (chunkInfo.name === "embed" ? "embed.js" : "assets/[name]-[hash].js"),
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

