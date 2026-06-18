import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable through dev-container
    // port forwarding (a 127.0.0.1-only bind isn't reachable from the forward).
    host: true,
    // Accept the <clone>.localhost Host header that the shared proxy forwards.
    // Without this, Vite's DNS-rebinding guard rejects proxied requests.
    allowedHosts: [".localhost"],
    // When served through the host proxy on port 80, HMR must connect back on 80
    // rather than the internal 5173. The dev container sets HMR_CLIENT_PORT=80;
    // left unset for direct :5173 access, where the default behaviour is correct.
    hmr: process.env.HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.HMR_CLIENT_PORT) }
      : undefined,
    proxy: {
      // API_PROXY lets a verification instance target an isolated API server
      "/api": process.env.API_PROXY ?? "http://localhost:3001",
    },
  },
});
