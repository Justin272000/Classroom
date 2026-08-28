import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

// Falls back to the current page's hostname (not a hardcoded "localhost") so a
// friend who opens the app via the host's LAN IP still reaches the right server.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
});
