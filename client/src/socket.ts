import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

// In dev, client (Vite, :5173) and server (:4000) run on different ports on
// the same host, so the fallback needs the explicit :4000 — falls back to the
// current page's hostname (not a hardcoded "localhost") so a friend who opens
// the app via the host's LAN IP still reaches the right server. In a real
// build (production or the iOS shell without an explicit override), the
// server serves the client itself, so same-origin is correct instead.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : window.location.origin);

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
});
