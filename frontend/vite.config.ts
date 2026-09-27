import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Point the dev proxy at a different backend with:
//   MULTICODE_BACKEND_URL=http://127.0.0.1:9000 npm run dev
const backend = process.env.MULTICODE_BACKEND_URL ?? "http://127.0.0.1:8001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
