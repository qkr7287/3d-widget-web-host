import { cpSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const from = join(root, "..", "3d-widget", "asset");
const to = join(root, "public", "widget-asset");

mkdirSync(join(root, "public"), { recursive: true });
cpSync(from, to, { recursive: true });
console.log("Copied 3d-widget assets to public/widget-asset");
