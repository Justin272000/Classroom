export interface Player {
  id: string;
  name: string;
  connected: boolean;
  character: string | null;
}

export type RoomPhase = "lobby" | "playing" | "results";

export type GameId = "wwe" | "whoami";

export interface WweGameState {
  id: "wwe";
  question: string;
  votedPlayerIds: string[];
  results?: { playerId: string; name: string; votes: number }[];
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

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  game: WweGameState | WhoamiGameState | null;
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
  "player:setCharacter": (
    payload: { character: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (message: string) => void;
}
