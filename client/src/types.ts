export interface Player {
  id: string;
  name: string;
  connected: boolean;
  character: string | null;
}

export type RoomPhase = "lobby" | "playing" | "results";

export type GameId =
  | "wwe"
  | "whoami"
  | "guessit"
  | "cancelculture"
  | "stadtlandfluss"
  | "zeitbombe"
  | "kennedeinefreunde"
  | "zahlen";

export interface WweGameState {
  id: "wwe";
  question: string;
  votedPlayerIds: string[];
  results?: { playerId: string; name: string; votes: number }[];
  deadline: number;
}

export type WhoamiStage = "assigning" | "asking" | "voting" | "revealed" | "guessing" | "finished";

export interface WhoamiIdentityView {
  targetId: string;
  assignerId: string;
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
  answer?: number;
}

export interface CancelCultureGameState {
  id: "cancelculture";
  statement: string;
  votedPlayerIds: string[];
  results?: { yes: number; no: number };
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
  lastRoundEntries: SlfEntry[] | null;
  scores: { playerId: string; name: string; total: number }[];
}

export type ZeitbombeStage = "answering" | "challenge" | "finished";
export type ZeitbombeLoseReason = "timeout" | "exploded" | "duplicate";

export interface ZeitbombeHistoryEntry {
  playerId: string;
  text: string;
}

export interface ZeitbombeGameState {
  id: "zeitbombe";
  category: string;
  stage: ZeitbombeStage;
  turnPlayerId: string | null;
  history: ZeitbombeHistoryEntry[];
  pendingAnswer: ZeitbombeHistoryEntry | null;
  challengedBy: string[];
  challengeThreshold: number;
  deadline: number;
  loserId: string | null;
  loseReason: ZeitbombeLoseReason | null;
}

export type KdfStage = "writing" | "assigning" | "results" | "finished";

export interface KdfTermToAssign {
  ownerId: string;
  text: string;
}

export interface KdfRoundEntry {
  targetPlayerId: string;
  termOwnerId: string;
  correct: boolean;
}

export interface KdfRoundResult {
  entries: KdfRoundEntry[];
  correctCount: number;
  allCorrect: boolean;
  points: number;
}

export interface KennedeineFreundeGameState {
  id: "kennedeinefreunde";
  stage: KdfStage;
  round: number;
  totalRounds: number;
  category: string;
  submittedPlayerIds: string[];
  assignedPlayerIds: string[];
  termsToAssign: KdfTermToAssign[];
  myResult: KdfRoundResult | null;
  revealedWords: { playerId: string; text: string }[];
  scores: { playerId: string; name: string; total: number }[];
  deadline: number;
}

export type ZahlenStage = "guessing" | "results" | "finished";
export type ZahlenFeedback = "higher" | "lower" | "correct";

export interface ZahlenRoundEntry {
  playerId: string;
  guess: number | null;
  closest: boolean;
  points: number;
}

export interface ZahlenGameState {
  id: "zahlen";
  stage: ZahlenStage;
  round: number;
  totalRounds: number;
  attempt: number;
  totalAttempts: number;
  submittedPlayerIds: string[];
  /** this viewer's feedback for the attempt that just completed — present once it has */
  myFeedback: ZahlenFeedback | null;
  /** the secret number — only revealed during "results"/"finished" */
  answer: number | null;
  /** the just-finished round's guesses + points, present during "results"/"finished" */
  lastRoundEntries: ZahlenRoundEntry[] | null;
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
    | ZeitbombeGameState
    | KennedeineFreundeGameState
    | ZahlenGameState
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
  "room:leave": () => void;
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
  "zeitbombe:submit": (payload: { text: string }) => void;
  "zeitbombe:challenge": () => void;
  "kennedeinefreunde:submitWord": (payload: { word: string }) => void;
  "kennedeinefreunde:submitAssignment": (payload: { assignment: Record<string, string> }) => void;
  "zahlen:submitGuess": (payload: { guess: number }) => void;
  "player:setCharacter": (
    payload: { character: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (message: string) => void;
}
