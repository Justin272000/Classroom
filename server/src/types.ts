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
  | "kennedeinefreunde";

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
  /** whose turn it is to answer — only meaningful during "answering" */
  turnPlayerId: string | null;
  history: ZeitbombeHistoryEntry[];
  /** the answer currently in its 3s challenge window — present only during "challenge" */
  pendingAnswer: ZeitbombeHistoryEntry | null;
  challengedBy: string[];
  /** how many challenges are needed to explode the pending answer */
  challengeThreshold: number;
  /** epoch ms when the current answering or challenge window closes */
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
  /** whose tile the guessed term was placed on */
  targetPlayerId: string;
  /** whose term (by true author) was placed there */
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
  /** this viewer's other players' terms to assign, shuffled — meaningful during "assigning" */
  termsToAssign: KdfTermToAssign[];
  /** this viewer's own result for the round just revealed — present during "results"/"finished" */
  myResult: KdfRoundResult | null;
  /** true word authorship, revealed once results are in — present during "results"/"finished" */
  revealedWords: { playerId: string; text: string }[];
  scores: { playerId: string; name: string; total: number }[];
  /** epoch ms when the current writing or assigning window closes */
  deadline: number;
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
  "zeitbombe:submit": (payload: { text: string }) => void;
  "zeitbombe:challenge": () => void;
  "kennedeinefreunde:submitWord": (payload: { word: string }) => void;
  "kennedeinefreunde:submitAssignment": (payload: { assignment: Record<string, string> }) => void;
  "player:setCharacter": (
    payload: { character: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (message: string) => void;
}
