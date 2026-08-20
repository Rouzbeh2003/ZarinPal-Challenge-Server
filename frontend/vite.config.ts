import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: {
    proxy: {
      // درخواست‌های API به Backend محلی (Docker) هدایت می‌شوند؛
      // session cookie و CSRF به‌درستی کار می‌کند.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});