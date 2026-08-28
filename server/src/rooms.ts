import { isCharacter } from "./characters.js";
import { pickStatement } from "./games/cancelculture.js";
import { pickQuestion as pickGuessItQuestion } from "./games/guessit.js";
import {
  allConnectedSubmitted as slfAllSubmitted,
  nextSlfRound,
  revealRound as revealSlfRound,
  startStadtLandFluss,
  submitWord as slfSubmitWordInternal,
  type InternalSlfGame,
} from "./games/stadtlandfluss.js";
import {
  askQuestion,
  confirmGuess,
  continueAfterReveal,
  currentPlayerId as whoamiCurrentPlayerId,
  eligibleVoterCount,
  startWhoami,
  submitAssignment,
  submitGuess,
  submitVote as submitWhoamiVoteInternal,
  type InternalWhoamiGame,
} from "./games/whoami.js";
import { pickQuestion as pickWweQuestion } from "./games/wwe.js";
import type {
  CancelCultureGameState,
  GuessItGameState,
  Player,
  RoomState,
  StadtLandFlussGameState,
  WhoamiGameState,
  WweGameState,
} from "./types.js";

/** Players have this long to answer a wwe question or cancelculture statement
 * before the server reveals results on its own, whether or not everyone answered. */
export const ANSWER_TIME_MS = 10_000;

interface InternalWweGame {
  id: "wwe";
  question: string;
  askedQuestions: Set<string>;
  votes: Map<string, string>; // voterId -> targetPlayerId
  deadline: number;
}

interface InternalGuessItGame {
  id: "guessit";
  question: string;
  answer: number;
  unit: string;
  askedQuestions: Set<string>;
  guesses: Map<string, number>;
}

interface InternalCancelCultureGame {
  id: "cancelculture";
  statement: string;
  askedStatements: Set<string>;
  votes: Map<string, boolean>;
  deadline: number;
}

type InternalGame =
  | InternalWweGame
  | InternalWhoamiGame
  | InternalGuessItGame
  | InternalCancelCultureGame
  | InternalSlfGame;

interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  phase: "lobby" | "playing" | "results";
  game: InternalGame | null;
}

const rooms = new Map<string, Room>();
// No I/O/0/1 to avoid confusion when read aloud or typed.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// A flaky mobile connection can drop and reconnect within seconds; don't nuke an
// empty room the instant its last player disconnects, or their own reconnect
// would land on "Raum nicht gefunden." Give it a grace window first.
const EMPTY_ROOM_GRACE_MS = 30_000;
const pendingDeletions = new Map<string, ReturnType<typeof setTimeout>>();

function cancelPendingDeletion(code: string): void {
  const timer = pendingDeletions.get(code);
  if (timer) {
    clearTimeout(timer);
    pendingDeletions.delete(code);
  }
}

function generateCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateCode();
  const room: Room = {
    code,
    hostId,
    players: new Map([[hostId, { id: hostId, name: hostName, connected: true, character: null }]]),
    phase: "lobby",
    game: null,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, playerId: string, name: string): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
  // Preserve a returning player's character pick (e.g. a reconnect rejoin);
  // only a genuinely new player starts without one.
  const character = room.players.get(playerId)?.character ?? null;
  room.players.set(playerId, { id: playerId, name, connected: true, character });
  cancelPendingDeletion(room.code);
  return room;
}

export function setCharacter(room: Room, playerId: string, character: string): boolean {
  if (!isCharacter(character)) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  const takenByOther = [...room.players.values()].some((p) => p.id !== playerId && p.character === character);
  if (takenByOther) return false;
  player.character = character;
  return true;
}

export function findRoomByPlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return undefined;
}

/** A client only ever belongs to one room in this app's UX. Call before create/join
 * so a stale membership from a previous room doesn't shadow the new one. Pass the
 * target room's code as `exceptCode` when joining/rejoining it, so a reconnecting
 * player (especially the host) isn't evicted from the very room they're entering.
 * Returns the codes of any rooms the player was removed from, to re-broadcast. */
export function removePlayerFromAllRooms(playerId: string, exceptCode?: string): string[] {
  const affected: string[] = [];
  for (const room of rooms.values()) {
    if (room.code === exceptCode) continue;
    if (!room.players.delete(playerId)) continue;
    affected.push(room.code);
    if (room.hostId === playerId) {
      const nextHost = [...room.players.values()].find((p) => p.connected);
      if (nextHost) room.hostId = nextHost.id;
    }
    if (room.players.size === 0) {
      cancelPendingDeletion(room.code);
      rooms.delete(room.code);
    }
  }
  return affected;
}

export function disconnectPlayer(playerId: string): Room | undefined {
  const room = findRoomByPlayer(playerId);
  if (!room) return undefined;
  const player = room.players.get(playerId);
  if (!player) return undefined;
  player.connected = false;

  if (room.hostId === playerId) {
    const nextHost = [...room.players.values()].find((p) => p.connected);
    if (nextHost) room.hostId = nextHost.id;
  }

  const anyoneConnected = [...room.players.values()].some((p) => p.connected);
  if (!anyoneConnected) {
    cancelPendingDeletion(room.code);
    const timer = setTimeout(() => {
      pendingDeletions.delete(room.code);
      const current = rooms.get(room.code);
      const stillEmpty = current && ![...current.players.values()].some((p) => p.connected);
      if (stillEmpty) rooms.delete(room.code);
    }, EMPTY_ROOM_GRACE_MS);
    pendingDeletions.set(room.code, timer);
  }
  return room;
}

export function startWweGame(room: Room): void {
  const askedQuestions = room.game?.id === "wwe" ? room.game.askedQuestions : new Set<string>();
  const question = pickWweQuestion(askedQuestions);
  askedQuestions.add(question);
  room.game = { id: "wwe", question, askedQuestions, votes: new Map(), deadline: Date.now() + ANSWER_TIME_MS };
  room.phase = "playing";
}

export function submitWweVote(room: Room, voterId: string, targetPlayerId: string): boolean {
  if (room.phase !== "playing" || room.game?.id !== "wwe") return false;
  if (!room.players.has(targetPlayerId)) return false;
  if (!room.players.has(voterId) || !room.players.get(voterId)?.connected) return false;

  room.game.votes.set(voterId, targetPlayerId);

  const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
  const allVoted = connectedIds.every((id) => (room.game as InternalWweGame).votes.has(id));
  if (allVoted) {
    room.phase = "results";
  }
  return true;
}

export function startWhoamiGame(room: Room): boolean {
  const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
  const game = startWhoami(connectedIds);
  if (!game) return false;
  room.game = game;
  room.phase = "playing";
  return true;
}

export function whoamiAssignName(room: Room, playerId: string, name: string): boolean {
  if (room.game?.id !== "whoami") return false;
  return submitAssignment(room.game, playerId, name);
}

export function whoamiAsk(room: Room, playerId: string, question: string): boolean {
  if (room.game?.id !== "whoami") return false;
  return askQuestion(room.game, playerId, question);
}

export function whoamiVote(room: Room, playerId: string, answer: boolean): boolean {
  if (room.game?.id !== "whoami") return false;
  return submitWhoamiVoteInternal(room.game, playerId, answer, room.players);
}

export function whoamiContinue(room: Room, playerId: string): boolean {
  if (room.game?.id !== "whoami") return false;
  return continueAfterReveal(room.game, playerId, room.players);
}

export function whoamiGuess(room: Room, playerId: string, guess: string): boolean {
  if (room.game?.id !== "whoami") return false;
  return submitGuess(room.game, playerId, guess);
}

export function whoamiConfirmGuess(room: Room, playerId: string, correct: boolean): boolean {
  if (room.game?.id !== "whoami") return false;
  return confirmGuess(room.game, playerId, correct, room.players);
}

export function startGuessItGame(room: Room): void {
  const askedQuestions = room.game?.id === "guessit" ? room.game.askedQuestions : new Set<string>();
  const q = pickGuessItQuestion(askedQuestions);
  askedQuestions.add(q.question);
  room.game = { id: "guessit", question: q.question, answer: q.answer, unit: q.unit, askedQuestions, guesses: new Map() };
  room.phase = "playing";
}

export function submitGuessItGuess(room: Room, playerId: string, guess: number): boolean {
  if (room.phase !== "playing" || room.game?.id !== "guessit") return false;
  if (!room.players.get(playerId)?.connected) return false;
  if (!Number.isFinite(guess)) return false;

  room.game.guesses.set(playerId, guess);

  const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
  const allGuessed = connectedIds.every((id) => (room.game as InternalGuessItGame).guesses.has(id));
  if (allGuessed) room.phase = "results";
  return true;
}

export function startCancelCultureGame(room: Room): void {
  const askedStatements = room.game?.id === "cancelculture" ? room.game.askedStatements : new Set<string>();
  const statement = pickStatement(askedStatements);
  askedStatements.add(statement);
  room.game = {
    id: "cancelculture",
    statement,
    askedStatements,
    votes: new Map(),
    deadline: Date.now() + ANSWER_TIME_MS,
  };
  room.phase = "playing";
}

export function submitCancelCultureVote(room: Room, playerId: string, answer: boolean): boolean {
  if (room.phase !== "playing" || room.game?.id !== "cancelculture") return false;
  if (!room.players.get(playerId)?.connected) return false;

  room.game.votes.set(playerId, answer);

  const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
  const allVoted = connectedIds.every((id) => (room.game as InternalCancelCultureGame).votes.has(id));
  if (allVoted) room.phase = "results";
  return true;
}

export function startSlfGame(room: Room): boolean {
  const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
  const game = startStadtLandFluss(connectedIds);
  if (!game) return false;
  room.game = game;
  room.phase = "playing";
  return true;
}

export function slfSubmitWord(room: Room, playerId: string, word: string): boolean {
  if (room.game?.id !== "stadtlandfluss") return false;
  const ok = slfSubmitWordInternal(room.game, playerId, word);
  if (ok && slfAllSubmitted(room.game, room.players)) {
    revealSlfRound(room.game, room.players);
  }
  return ok;
}

/** Host-only: advances from a round's results to the next round, or to the
 * final podium if that was the last round. */
export function slfNext(room: Room, playerId: string): boolean {
  if (room.game?.id !== "stadtlandfluss") return false;
  if (room.hostId !== playerId) return false;
  return nextSlfRound(room.game);
}

/** Called when a round's answer-timer expires. Reveals results with whatever
 * votes came in, same as if everyone had answered. No-ops if the round already
 * ended some other way (all voted, host advanced, game ended) by the time it fires. */
export function forceRevealTimedOut(room: Room): boolean {
  if (room.phase !== "playing") return false;
  if (room.game?.id !== "wwe" && room.game?.id !== "cancelculture") return false;
  room.phase = "results";
  return true;
}

export function endGame(room: Room): void {
  room.phase = "lobby";
  room.game = null;
}

export function toPublicState(room: Room, forPlayerId: string): RoomState {
  let game:
    | WweGameState
    | WhoamiGameState
    | GuessItGameState
    | CancelCultureGameState
    | StadtLandFlussGameState
    | null = null;

  if (room.game?.id === "wwe") {
    const votedPlayerIds = [...room.game.votes.keys()];
    let results: WweGameState["results"];
    if (room.phase === "results") {
      const tally = new Map<string, number>();
      for (const targetId of room.game.votes.values()) {
        tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
      }
      results = [...room.players.values()]
        .map((p) => ({ playerId: p.id, name: p.name, votes: tally.get(p.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes);
    }
    game = { id: "wwe", question: room.game.question, votedPlayerIds, results, deadline: room.game.deadline };
  } else if (room.game?.id === "whoami") {
    const g = room.game;
    const questioner = whoamiCurrentPlayerId(g);
    const identities = g.assignments.map((a) => {
      const visibleToViewer =
        a.assignerId === forPlayerId ||
        g.solved.has(a.targetId) ||
        g.stage === "finished" ||
        (a.targetId === questioner && forPlayerId !== a.targetId);
      return {
        targetId: a.targetId,
        assignerId: a.assignerId,
        name: visibleToViewer ? a.name : null,
      };
    });
    game = {
      id: "whoami",
      stage: g.stage,
      identities,
      turnOrder: g.turnOrder,
      currentPlayerId: questioner,
      assignedSubmittedIds: g.assignments.filter((a) => a.name !== null).map((a) => a.targetId),
      question: g.question,
      votedIds: [...g.votes.keys()],
      eligibleVoterCount: eligibleVoterCount(g, room.players),
      lastAnswer: g.stage === "revealed" ? g.lastAnswer : null,
      pendingGuess: g.pendingGuess,
      solved: [...g.solved],
    };
  } else if (room.game?.id === "guessit") {
    const g = room.game;
    const guessedPlayerIds = [...g.guesses.keys()];
    let results: GuessItGameState["results"];
    let answer: number | undefined;
    if (room.phase === "results") {
      results = [...room.players.values()]
        .filter((p) => g.guesses.has(p.id))
        .map((p) => ({ playerId: p.id, name: p.name, guess: g.guesses.get(p.id)! }))
        .sort((a, b) => a.guess - b.guess);
      answer = g.answer;
    }
    game = { id: "guessit", question: g.question, unit: g.unit, guessedPlayerIds, results, answer };
  } else if (room.game?.id === "cancelculture") {
    const g = room.game;
    const votedPlayerIds = [...g.votes.keys()];
    let results: CancelCultureGameState["results"];
    if (room.phase === "results") {
      let yes = 0;
      let no = 0;
      for (const v of g.votes.values()) (v ? yes++ : no++);
      results = { yes, no };
    }
    game = { id: "cancelculture", statement: g.statement, votedPlayerIds, results, deadline: g.deadline };
  } else if (room.game?.id === "stadtlandfluss") {
    const g = room.game;
    const scores = [...room.players.values()]
      .map((p) => ({ playerId: p.id, name: p.name, total: g.scores.get(p.id) ?? 0 }))
      .sort((a, b) => b.total - a.total);
    game = {
      id: "stadtlandfluss",
      stage: g.stage,
      round: g.round,
      totalRounds: g.totalRounds,
      category: g.category,
      submittedPlayerIds: [...g.words.keys()],
      lastRoundEntries: g.lastRoundEntries,
      scores,
    };
  }

  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()],
    phase: room.phase,
    game,
  };
}

export type { Room };
