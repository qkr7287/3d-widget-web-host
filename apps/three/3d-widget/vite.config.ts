import { defineConfig } from "vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { DEV_SERVER_HOST, PORT_3D_WIDGET_THREE } from "../../../config/dev-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    host: DEV_SERVER_HOST,
    port: PORT_3D_WIDGET_THREE,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  },
  preview: {
    host: DEV_SERVER_HOST,
    port: PORT_3D_WIDGET_THREE,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        embed: resolve(__dirname, "src/embed.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => (chunkInfo.name === "embed" ? "embed.js" : "assets/[name]-[hash].js"),
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
