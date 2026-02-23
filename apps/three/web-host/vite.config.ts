import { defineConfig } from "vite";
import {
  DEV_SERVER_HOST,
  PORT_WEB_HOST_THREE,
  WIDGET_EMBED_URL_OVERRIDE,
  WIDGET_HOST,
  WIDGET_PROTOCOL,
  WIDGET_PUBLIC_PORT_THREE,
} from "../../../config/dev-config";

export default defineConfig(({ mode }) => ({
  server: {
    host: DEV_SERVER_HOST,
    port: PORT_WEB_HOST_THREE,
    strictPort: true,
  },
  preview: {
    host: DEV_SERVER_HOST,
    port: PORT_WEB_HOST_THREE,
    strictPort: true,
  },
  define: {
    __WIDGET_PROTOCOL__: JSON.stringify(WIDGET_PROTOCOL),
    __WIDGET_HOST__: JSON.stringify(WIDGET_HOST),
    __WIDGET_PORT__: JSON.stringify(WIDGET_PUBLIC_PORT_THREE),
    __WIDGET_EMBED_URL_OVERRIDE__: JSON.stringify(WIDGET_EMBED_URL_OVERRIDE),
    __MODE__: JSON.stringify(mode),
  },
}));

