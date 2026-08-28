import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all interfaces, not just localhost, so phones on the same
    // WiFi can open the app (and its QR-code invite links) via the LAN IP.
    host: true,
  },
});
