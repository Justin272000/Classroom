import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  createRoom,
  disconnectPlayer,
  endGame,
  findRoomByPlayer,
  getRoom,
  joinRoom,
  removePlayerFromAllRooms,
  startWweGame,
  submitVote,
  toPublicState,
} from "./rooms.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

// Player identity is a stable client-generated id (survives reconnects), not the
// ephemeral socket.id. This map resolves the socket handling an event back to it.
const socketToClient = new Map<string, string>();

function broadcastRoom(code: string) {
  const room = getRoom(code);
  if (!room) return;
  io.to(room.code).emit("room:state", toPublicState(room));
}

function cleanName(raw: string): string {
  return raw.trim().slice(0, 20);
}

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  socket.on("room:create", (payload, ack) => {
    const name = cleanName(payload?.name ?? "");
    const clientId = (payload?.clientId ?? "").trim();
    if (!clientId) {
      ack({ ok: false, error: "Fehlende Client-ID." });
      return;
    }
    if (!name) {
      ack({ ok: false, error: "Name darf nicht leer sein." });
      return;
    }
    for (const staleCode of removePlayerFromAllRooms(clientId)) broadcastRoom(staleCode);

    const room = createRoom(clientId, name);
    socketToClient.set(socket.id, clientId);
    socket.join(room.code);
    ack({ ok: true, state: toPublicState(room) });
  });

  socket.on("room:join", (payload, ack) => {
    const name = cleanName(payload?.name ?? "");
    const code = (payload?.code ?? "").trim().toUpperCase();
    const clientId = (payload?.clientId ?? "").trim();
    if (!clientId) {
      ack({ ok: false, error: "Fehlende Client-ID." });
      return;
    }
    if (!name) {
      ack({ ok: false, error: "Name darf nicht leer sein." });
      return;
    }
    if (!getRoom(code)) {
      ack({ ok: false, error: "Raum nicht gefunden." });
      return;
    }
    // Exclude the target room: a reconnecting player (especially the host)
    // rejoining the room they're already in must not be evicted from it first.
    for (const staleCode of removePlayerFromAllRooms(clientId, code)) broadcastRoom(staleCode);

    const room = joinRoom(code, clientId, name);
    if (!room) {
      ack({ ok: false, error: "Raum nicht gefunden." });
      return;
    }
    socketToClient.set(socket.id, clientId);
    socket.join(room.code);
    ack({ ok: true, state: toPublicState(room) });
    broadcastRoom(room.code);
  });

  socket.on("game:start", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || room.hostId !== clientId) return;
    if (payload?.gameId === "wwe") {
      startWweGame(room);
      broadcastRoom(room.code);
    }
  });

  socket.on("game:next", () => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || room.hostId !== clientId) return;
    if (room.game?.id === "wwe") {
      startWweGame(room);
      broadcastRoom(room.code);
    }
  });

  socket.on("game:end", () => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || room.hostId !== clientId) return;
    endGame(room);
    broadcastRoom(room.code);
  });

  socket.on("wwe:vote", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    const ok = submitVote(room, clientId, payload?.targetPlayerId ?? "");
    if (ok) broadcastRoom(room.code);
  });

  socket.on("disconnect", () => {
    const clientId = socketToClient.get(socket.id);
    socketToClient.delete(socket.id);
    if (!clientId) return;
    const room = disconnectPlayer(clientId);
    if (room) broadcastRoom(room.code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mindgames server listening on http://localhost:${PORT}`);
});
