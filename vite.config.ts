import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || "/";

const WOKWI_SRC = path.resolve(
  import.meta.dirname,
  "./wokwi-elements/src/index.ts",
);
const wokwiAlias = fs.existsSync(WOKWI_SRC)
  ? { "@wokwi/elements": WOKWI_SRC }
  : {};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      ...wokwiAlias,
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["lit", "lit/decorators.js"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
