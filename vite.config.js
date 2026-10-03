import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Disable HMR websocket if running in a sandboxed iframe environment
    // (e.g. Google AI Studio) where the websocket cannot connect.
    // Comment this out for normal local development.
    // hmr: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
