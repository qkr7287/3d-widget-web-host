import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 6000,
    strictPort: true,
    // combined-app에서 3d-widget의 src/asset을 로컬 import/@fs로 읽어올 수 있게 허용
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
});

