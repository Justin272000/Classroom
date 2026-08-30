import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  ANSWER_TIME_MS,
  createRoom,
  disconnectPlayer,
  endGame,
  findRoomByPlayer,
  forceRevealTimedOut,
  getRoom,
  joinRoom,
  kdfNext,
  kdfResolveTimeout,
  kdfSubmitAssignment,
  kdfSubmitWord,
  removePlayerFromAllRooms,
  resolveZeitbombeTimeout,
  setCharacter,
  slfNext,
  slfSubmitWord,
  startCancelCultureGame,
  startGuessItGame,
  startKdfGame,
  startSlfGame,
  startWhoamiGame,
  startWweGame,
  startZahlenGame,
  startZeitbombeGame,
  submitCancelCultureVote,
  submitGuessItGuess,
  submitWweVote,
  submitZeitbombeAnswer,
  submitZeitbombeChallenge,
  toPublicState,
  whoamiAsk,
  whoamiAssignName,
  whoamiConfirmGuess,
  whoamiContinue,
  whoamiGuess,
  whoamiVote,
  zahlenNext,
  zahlenSubmitGuess,
  type Room,
} from "./rooms.js";
import { KDF_ROUND_TIME_MS } from "./games/kennedeinefreunde.js";
import { ZEITBOMBE_ANSWER_MS, ZEITBOMBE_CHALLENGE_MS } from "./games/zeitbombe.js";
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

// wwe/cancelculture rounds auto-reveal after ANSWER_TIME_MS even if not everyone
// answered. One pending timeout per room; always cleared before a new one is set
// so a stale timer from an earlier round can never fire against a later one.
const roundTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRoundTimer(code: string) {
  const timer = roundTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    roundTimers.delete(code);
  }
}

function scheduleRoundTimer(room: Room) {
  clearRoundTimer(room.code);
  if (room.game?.id === "wwe" || room.game?.id === "cancelculture") {
    const timer = setTimeout(() => {
      roundTimers.delete(room.code);
      const current = getRoom(room.code);
      if (current && forceRevealTimedOut(current)) broadcastRoom(current.code);
    }, ANSWER_TIME_MS);
    roundTimers.set(room.code, timer);
  } else if (room.game?.id === "zeitbombe" && room.game.stage !== "finished") {
    // Alternates between a 10s answering window and a 3s challenge window.
    // Each time this timer fires and the round is still going (bomb passed on
    // rather than exploding), it reschedules itself for the next window.
    const durationMs = room.game.stage === "answering" ? ZEITBOMBE_ANSWER_MS : ZEITBOMBE_CHALLENGE_MS;
    const timer = setTimeout(() => {
      roundTimers.delete(room.code);
      const current = getRoom(room.code);
      if (!current || !resolveZeitbombeTimeout(current)) return;
      broadcastRoom(current.code);
      scheduleRoundTimer(current);
    }, durationMs);
    roundTimers.set(room.code, timer);
  } else if (
    room.game?.id === "kennedeinefreunde" &&
    (room.game.stage === "writing" || room.game.stage === "assigning")
  ) {
    // Same 10s window for both the writing and assigning phases. Each time
    // this fires and the round is still going (writing -> assigning), it
    // reschedules itself for the next window.
    const timer = setTimeout(() => {
      roundTimers.delete(room.code);
      const current = getRoom(room.code);
      if (!current || !kdfResolveTimeout(current)) return;
      broadcastRoom(current.code);
      scheduleRoundTimer(current);
    }, KDF_ROUND_TIME_MS);
    roundTimers.set(room.code, timer);
  }
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
      scheduleRoundTimer(room);
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
    } else if (payload?.gameId === "guessit") {
      startGuessItGame(room);
      ack({ ok: true });
      broadcastRoom(room.code);
    } else if (payload?.gameId === "cancelculture") {
      startCancelCultureGame(room);
      scheduleRoundTimer(room);
      ack({ ok: true });
      broadcastRoom(room.code);
    } else if (payload?.gameId === "stadtlandfluss") {
      const started = startSlfGame(room);
      if (started) {
        ack({ ok: true });
        broadcastRoom(room.code);
      } else {
        ack({ ok: false, error: "Mindestens 2 Spieler nötig." });
      }
    } else if (payload?.gameId === "zeitbombe") {
      const started = startZeitbombeGame(room);
      if (started) {
        scheduleRoundTimer(room);
        ack({ ok: true });
        broadcastRoom(room.code);
      } else {
        ack({ ok: false, error: "Mindestens 2 Spieler nötig." });
      }
    } else if (payload?.gameId === "kennedeinefreunde") {
      const started = startKdfGame(room);
      if (started) {
        scheduleRoundTimer(room);
        ack({ ok: true });
        broadcastRoom(room.code);
      } else {
        ack({ ok: false, error: "Mindestens 3 Spieler nötig." });
      }
    } else if (payload?.gameId === "zahlen") {
      startZahlenGame(room);
      ack({ ok: true });
      broadcastRoom(room.code);
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
      scheduleRoundTimer(room);
      broadcastRoom(room.code);
    } else if (room.game?.id === "guessit") {
      startGuessItGame(room);
      broadcastRoom(room.code);
    } else if (room.game?.id === "cancelculture") {
      startCancelCultureGame(room);
      scheduleRoundTimer(room);
      broadcastRoom(room.code);
    } else if (room.game?.id === "stadtlandfluss") {
      if (slfNext(room, clientId)) broadcastRoom(room.code);
    } else if (room.game?.id === "zeitbombe") {
      if (startZeitbombeGame(room)) {
        scheduleRoundTimer(room);
        broadcastRoom(room.code);
      }
    } else if (room.game?.id === "kennedeinefreunde") {
      if (kdfNext(room, clientId)) {
        scheduleRoundTimer(room);
        broadcastRoom(room.code);
      }
    } else if (room.game?.id === "zahlen") {
      if (zahlenNext(room, clientId)) broadcastRoom(room.code);
    }
  });

  socket.on("game:end", () => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || room.hostId !== clientId) return;
    clearRoundTimer(room.code);
    endGame(room);
    broadcastRoom(room.code);
  });

  socket.on("wwe:vote", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    const ok = submitWweVote(room, clientId, payload?.targetPlayerId ?? "");
    if (ok) {
      if (room.phase === "results") clearRoundTimer(room.code);
      broadcastRoom(room.code);
    }
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

  socket.on("guessit:submit", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    const guess = Number(payload?.guess);
    if (submitGuessItGuess(room, clientId, guess)) broadcastRoom(room.code);
  });

  socket.on("cancelculture:vote", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (submitCancelCultureVote(room, clientId, !!payload?.answer)) {
      if (room.phase === "results") clearRoundTimer(room.code);
      broadcastRoom(room.code);
    }
  });

  socket.on("stadtlandfluss:submitWord", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (slfSubmitWord(room, clientId, payload?.word ?? "")) broadcastRoom(room.code);
  });

  socket.on("zeitbombe:submit", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (submitZeitbombeAnswer(room, clientId, payload?.text ?? "")) {
      scheduleRoundTimer(room);
      broadcastRoom(room.code);
    }
  });

  socket.on("zeitbombe:challenge", () => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (submitZeitbombeChallenge(room, clientId)) broadcastRoom(room.code);
  });

  socket.on("kennedeinefreunde:submitWord", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    if (kdfSubmitWord(room, clientId, payload?.word ?? "")) {
      // Only reschedule if this specific submission was the one that moved
      // the round from writing to assigning — an in-between submission
      // (not everyone in yet) must not reset the writing timer.
      if (room.game?.id === "kennedeinefreunde" && room.game.stage === "assigning") {
        scheduleRoundTimer(room);
      }
      broadcastRoom(room.code);
    }
  });

  socket.on("kennedeinefreunde:submitAssignment", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    const assignment = new Map(Object.entries(payload?.assignment ?? {}));
    if (kdfSubmitAssignment(room, clientId, assignment)) {
      if (room.game?.id === "kennedeinefreunde" && room.game.stage === "results") {
        clearRoundTimer(room.code);
      }
      broadcastRoom(room.code);
    }
  });

  socket.on("zahlen:submitGuess", (payload) => {
    const clientId = socketToClient.get(socket.id);
    const room = clientId ? findRoomByPlayer(clientId) : undefined;
    if (!room || !clientId) return;
    const guess = Number(payload?.guess);
    if (zahlenSubmitGuess(room, clientId, guess)) broadcastRoom(room.code);
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
  console.log(`Classroom server listening on http://localhost:${PORT}`);
});
