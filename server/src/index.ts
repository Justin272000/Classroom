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
  setCharacter,
  startWhoamiGame,
  startWweGame,
  submitWweVote,
  toPublicState,
  whoamiAsk,
  whoamiAssignName,
  whoamiConfirmGuess,
  whoamiContinue,
  whoamiGuess,
  whoamiVote,
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
// ephemeral socket.id. These maps translate between the two in both directions.
const socketToClient = new Map<string, string>();
const clientToSocket = new Map<string, string>();

// Some games (whoami) show different players different things — who's allowed to
// see a given identity depends on the viewer — so state can't be a single room-wide
// broadcast. Every recipient gets their own personalized snapshot instead.
function broadcastRoom(code: string) {
  const room = getRoom(code);
  if (!room) return;
  for (const player of room.players.values()) {
    const socketId = clientToSocket.get(player.id);
    if (!socketId) continue;
    io.to(socketId).emit("room:state", toPublicState(room, player.id));
  }
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
    clientToSocket.set(clientId, socket.id);
    socket.join(room.code);
    ack({ ok: true, state: toPublicState(room, clientId) });
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
    clientToSocket.set(clientId, socket.id);
    socket.join(room.code);
    ack({ ok: true, state: toPublicState(room, clientId) });
    broadcastRoom(room.code);
  });

  socket.on("game:start", (payload, ack) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || room.hostId !== clientId) {
      ack({ ok: false, error: "Nur der Host kann ein Spiel starten." });
      return;
    }
    if (payload?.gameId === "wwe") {
      startWweGame(room);
      ack({ ok: true });
      broadcastRoom(room.code);
    } else if (payload?.gameId === "whoami") {
      const started = startWhoamiGame(room);
      if (started) {
        ack({ ok: true });
        broadcastRoom(room.code);
      } else {
        ack({ ok: false, error: "Mindestens 2 Spieler nötig." });
      }
    } else {
      ack({ ok: false, error: "Unbekanntes Spiel." });
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
    const ok = submitWweVote(room, clientId, payload?.targetPlayerId ?? "");
    if (ok) broadcastRoom(room.code);
  });

  socket.on("whoami:assignName", (payload, ack) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) {
      ack({ ok: false, error: "Nicht in einem Raum." });
      return;
    }
    const ok = whoamiAssignName(room, clientId, payload?.name ?? "");
    if (ok) {
      ack({ ok: true });
      broadcastRoom(room.code);
    } else {
      ack({ ok: false, error: "Name konnte nicht gesetzt werden." });
    }
  });

  socket.on("whoami:ask", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (whoamiAsk(room, clientId, payload?.question ?? "")) broadcastRoom(room.code);
  });

  socket.on("whoami:vote", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (whoamiVote(room, clientId, !!payload?.answer)) broadcastRoom(room.code);
  });

  socket.on("whoami:continue", () => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (whoamiContinue(room, clientId)) broadcastRoom(room.code);
  });

  socket.on("whoami:guess", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (whoamiGuess(room, clientId, payload?.guess ?? "")) broadcastRoom(room.code);
  });

  socket.on("whoami:confirmGuess", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (whoamiConfirmGuess(room, clientId, !!payload?.correct)) broadcastRoom(room.code);
  });

  socket.on("player:setCharacter", (payload, ack) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) {
      ack({ ok: false, error: "Nicht in einem Raum." });
      return;
    }
    const ok = setCharacter(room, clientId, payload?.character ?? "");
    if (ok) {
      ack({ ok: true });
      broadcastRoom(room.code);
    } else {
      ack({ ok: false, error: "Charakter nicht verfügbar." });
    }
  });

  socket.on("disconnect", () => {
    const clientId = socketToClient.get(socket.id);
    socketToClient.delete(socket.id);
    // Only clear the reverse mapping if it still points at this socket — a
    // near-simultaneous reconnect may have already replaced it with a new one.
    if (clientId && clientToSocket.get(clientId) === socket.id) {
      clientToSocket.delete(clientId);
    }
    if (!clientId) return;
    const room = disconnectPlayer(clientId);
    if (room) broadcastRoom(room.code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mindgames server listening on http://localhost:${PORT}`);
});
