import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: { ref: true }, // forwardRef açık
    }),
  ],
  server: {
    port: 5173,                // optional: ensure your frontend runs here
    open: true,                // auto-opens browser
    host: true,                // allow LAN access
    proxy: {
      "/api": {
        target: "http://localhost:5138", // your backend
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
  },
});
