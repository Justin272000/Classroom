import { wordsMatch } from "../gameUtils/fuzzyMatch.js";
import { pickCategory } from "./stadtlandfluss.js";
import type { Player } from "../types.js";

/** Time the current player has to submit an answer before losing by timeout. */
export const ZEITBOMBE_ANSWER_MS = 10_000;
/** Time everyone else has to challenge a just-submitted answer before it's accepted. */
export const ZEITBOMBE_CHALLENGE_MS = 3_000;

export type ZeitbombeStage = "answering" | "challenge" | "finished";
export type ZeitbombeLoseReason = "timeout" | "exploded" | "duplicate";

export interface ZeitbombeHistoryEntry {
  playerId: string;
  text: string;
}

export interface InternalZeitbombeGame {
  id: "zeitbombe";
  category: string;
  stage: ZeitbombeStage;
  turnOrder: string[];
  turnIndex: number;
  history: ZeitbombeHistoryEntry[];
  /** the answer currently in its 3s challenge window — present only during "challenge" */
  pendingAnswer: ZeitbombeHistoryEntry | null;
  challengedBy: string[];
  /** epoch ms — end of the current answering or challenge window */
  deadline: number;
  loserId: string | null;
  loseReason: ZeitbombeLoseReason | null;
}

/** `usedCategories` is owned by the caller (the room) and mutated in place, so
 * categories already used in earlier rounds in this room stay excluded here too —
 * not just within this one round. Turn order is freshly shuffled each round. */
export function startZeitbombe(
  connectedPlayerIds: string[],
  usedCategories: Set<string>
): InternalZeitbombeGame | null {
  if (connectedPlayerIds.length < 2) return null;
  const turnOrder = [...connectedPlayerIds];
  for (let i = turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
  }
  const category = pickCategory(usedCategories);
  usedCategories.add(category);
  return {
    id: "zeitbombe",
    category,
    stage: "answering",
    turnOrder,
    turnIndex: 0,
    history: [],
    pendingAnswer: null,
    challengedBy: [],
    deadline: Date.now() + ZEITBOMBE_ANSWER_MS,
    loserId: null,
    loseReason: null,
  };
}

function nextConnectedIndex(game: InternalZeitbombeGame, players: Map<string, Player>, fromIndex: number): number {
  const n = game.turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (players.get(game.turnOrder[idx])?.connected) return idx;
  }
  return fromIndex;
}

/** Called when the current player submits an answer during "answering". A
 * fuzzy-duplicate of anything already said this round ends the round on the
 * spot; otherwise it opens the 3s challenge window for everyone else. */
export function submitAnswer(game: InternalZeitbombeGame, playerId: string, text: string): boolean {
  if (game.stage !== "answering") return false;
  if (game.turnOrder[game.turnIndex] !== playerId) return false;
  const trimmed = text.trim().slice(0, 40);
  if (!trimmed) return false;

  if (game.history.some((h) => wordsMatch(h.text, trimmed))) {
    game.loserId = playerId;
    game.loseReason = "duplicate";
    game.stage = "finished";
    return true;
  }

  game.pendingAnswer = { playerId, text: trimmed };
  game.challengedBy = [];
  game.stage = "challenge";
  game.deadline = Date.now() + ZEITBOMBE_CHALLENGE_MS;
  return true;
}

/** A player other than the answerer disputes the pending answer. Just records
 * the challenge — resolution always waits for the full 3s window to elapse. */
export function submitChallenge(game: InternalZeitbombeGame, playerId: string): boolean {
  if (game.stage !== "challenge" || !game.pendingAnswer) return false;
  if (playerId === game.pendingAnswer.playerId) return false;
  if (game.challengedBy.includes(playerId)) return false;
  game.challengedBy.push(playerId);
  return true;
}

/** Call once the 3s challenge window has fully elapsed. At least half of the
 * OTHER connected players challenging explodes the bomb (the answerer loses);
 * otherwise the answer is accepted into the history and the bomb passes on. */
export function resolveChallengeWindow(game: InternalZeitbombeGame, players: Map<string, Player>): boolean {
  if (game.stage !== "challenge" || !game.pendingAnswer) return false;
  const answerer = game.pendingAnswer.playerId;
  const otherConnected = [...players.values()].filter((p) => p.connected && p.id !== answerer);
  const validChallenges = game.challengedBy.filter((id) => otherConnected.some((p) => p.id === id));
  const threshold = Math.ceil(otherConnected.length / 2);

  if (otherConnected.length > 0 && validChallenges.length >= threshold) {
    game.loserId = answerer;
    game.loseReason = "exploded";
    game.stage = "finished";
    game.pendingAnswer = null;
    return true;
  }

  game.history.push(game.pendingAnswer);
  game.pendingAnswer = null;
  game.challengedBy = [];
  game.turnIndex = nextConnectedIndex(game, players, game.turnIndex);
  game.stage = "answering";
  game.deadline = Date.now() + ZEITBOMBE_ANSWER_MS;
  return true;
}

/** Call once the 10s answering window has fully elapsed without a submission —
 * the current player loses by timeout. */
export function resolveAnswerTimeout(game: InternalZeitbombeGame): boolean {
  if (game.stage !== "answering") return false;
  game.loserId = game.turnOrder[game.turnIndex] ?? null;
  game.loseReason = "timeout";
  game.stage = "finished";
  return true;
}

/** How many challenges are currently needed to explode the pending answer —
 * for display purposes; 0 outside the "challenge" stage. */
export function challengeThreshold(game: InternalZeitbombeGame, players: Map<string, Player>): number {
  if (game.stage !== "challenge" || !game.pendingAnswer) return 0;
  const answerer = game.pendingAnswer.playerId;
  const otherConnectedCount = [...players.values()].filter((p) => p.connected && p.id !== answerer).length;
  return Math.ceil(otherConnectedCount / 2);
}
