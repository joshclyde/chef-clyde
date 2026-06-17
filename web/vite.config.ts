import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable through dev-container
    // port forwarding (a 127.0.0.1-only bind isn't reachable from the forward).
    host: true,
    proxy: {
      // API_PROXY lets a verification instance target an isolated API server
      "/api": process.env.API_PROXY ?? "http://localhost:3001",
    },
  },
});
