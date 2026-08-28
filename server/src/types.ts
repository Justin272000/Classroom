export interface Player {
  id: string;
  name: string;
  connected: boolean;
  character: string | null;
}

export type RoomPhase = "lobby" | "playing" | "results";

export type GameId = "wwe" | "whoami" | "guessit" | "cancelculture" | "stadtlandfluss";

export interface WweGameState {
  id: "wwe";
  question: string;
  votedPlayerIds: string[];
  results?: { playerId: string; name: string; votes: number }[];
  /** epoch ms when the answer window for the current question closes. */
  deadline: number;
}

export type WhoamiStage = "assigning" | "asking" | "voting" | "revealed" | "guessing" | "finished";

export interface WhoamiIdentityView {
  targetId: string;
  assignerId: string;
  /** null when hidden from the requesting viewer (e.g. it's their own, unsolved identity). */
  name: string | null;
}

export interface WhoamiGameState {
  id: "whoami";
  stage: WhoamiStage;
  identities: WhoamiIdentityView[];
  turnOrder: string[];
  currentPlayerId: string | null;
  assignedSubmittedIds: string[];
  question: string | null;
  votedIds: string[];
  eligibleVoterCount: number;
  lastAnswer: boolean | null;
  pendingGuess: string | null;
  solved: string[];
}

export interface GuessItGameState {
  id: "guessit";
  question: string;
  unit: string;
  guessedPlayerIds: string[];
  results?: { playerId: string; name: string; guess: number }[];
  /** only present once revealed */
  answer?: number;
}

export interface CancelCultureGameState {
  id: "cancelculture";
  statement: string;
  votedPlayerIds: string[];
  /** only present once revealed — individual votes are never exposed, by design */
  results?: { yes: number; no: number };
  /** epoch ms when the answer window for the current statement closes. */
  deadline: number;
}

export type SlfStage = "writing" | "results" | "finished";

export interface SlfEntry {
  playerId: string;
  word: string | null;
  points: number;
}

export interface StadtLandFlussGameState {
  id: "stadtlandfluss";
  stage: SlfStage;
  round: number;
  totalRounds: number;
  category: string;
  submittedPlayerIds: string[];
  /** the just-finished round's words + points, present during "results" and "finished" */
  lastRoundEntries: SlfEntry[] | null;
  scores: { playerId: string; name: string; total: number }[];
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  game:
    | WweGameState
    | WhoamiGameState
    | GuessItGameState
    | CancelCultureGameState
    | StadtLandFlussGameState
    | null;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: { name: string; clientId: string },
    ack: (res: { ok: true; state: RoomState } | { ok: false; error: string }) => void
  ) => void;
  "room:join": (
    payload: { code: string; name: string; clientId: string },
    ack: (res: { ok: true; state: RoomState } | { ok: false; error: string }) => void
  ) => void;
  "game:start": (
    payload: { gameId: GameId },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "game:next": () => void;
  "game:end": () => void;
  "wwe:vote": (payload: { targetPlayerId: string }) => void;
  "whoami:assignName": (
    payload: { name: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "whoami:ask": (payload: { question: string }) => void;
  "whoami:vote": (payload: { answer: boolean }) => void;
  "whoami:guess": (payload: { guess: string }) => void;
  "whoami:confirmGuess": (payload: { correct: boolean }) => void;
  "whoami:continue": () => void;
  "guessit:submit": (payload: { guess: number }) => void;
  "cancelculture:vote": (payload: { answer: boolean }) => void;
  "stadtlandfluss:submitWord": (payload: { word: string }) => void;
  "player:setCharacter": (
    payload: { character: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (message: string) => void;
}
