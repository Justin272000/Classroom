import { pickCategory } from "./stadtlandfluss.js";
import type { Player } from "../types.js";

export type KdfStage = "writing" | "assigning" | "results" | "finished";

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

export interface InternalKdfGame {
  id: "kennedeinefreunde";
  stage: KdfStage;
  round: number;
  totalRounds: number;
  category: string;
  usedCategories: Set<string>;
  /** playerId -> the term they wrote this round */
  words: Map<string, string>;
  /** playerId -> their confirmed guess this round (targetPlayerId -> termOwnerId) */
  assignments: Map<string, Map<string, string>>;
  lastRoundResults: Map<string, KdfRoundResult> | null;
  scores: Map<string, number>;
}

/** Needs at least 3 players — with only 2, the "assignment" is a single term
 * onto a single tile with no real guess involved. */
export function startKennedeineFreunde(
  connectedPlayerIds: string[],
  usedCategories: Set<string>
): InternalKdfGame | null {
  if (connectedPlayerIds.length < 3) return null;
  const category = pickCategory(usedCategories);
  usedCategories.add(category);
  return {
    id: "kennedeinefreunde",
    stage: "writing",
    round: 1,
    totalRounds: 10,
    category,
    usedCategories,
    words: new Map(),
    assignments: new Map(),
    lastRoundResults: null,
    scores: new Map(connectedPlayerIds.map((id) => [id, 0])),
  };
}

export function submitWord(game: InternalKdfGame, playerId: string, word: string): boolean {
  if (game.stage !== "writing") return false;
  const trimmed = word.trim().slice(0, 30);
  if (!trimmed) return false;
  game.words.set(playerId, trimmed);
  return true;
}

export function allConnectedSubmittedWords(game: InternalKdfGame, players: Map<string, Player>): boolean {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  return connectedIds.length > 0 && connectedIds.every((id) => game.words.has(id));
}

/** Moves from "writing" to "assigning" once everyone has submitted a word. */
export function beginAssigning(game: InternalKdfGame): void {
  game.stage = "assigning";
}

/** `assignment` maps targetPlayerId -> termOwnerId: for the tile belonging to
 * targetPlayerId, which term (identified by its true author) the submitting
 * player placed there. Must be a full, valid bijection over exactly the
 * other connected players who wrote a word this round — anything else
 * (missing entries, duplicates, unknown ids) is rejected. */
export function submitAssignment(
  game: InternalKdfGame,
  playerId: string,
  assignment: Map<string, string>,
  players: Map<string, Player>
): boolean {
  if (game.stage !== "assigning") return false;
  if (!players.get(playerId)?.connected) return false;
  if (game.assignments.has(playerId)) return false;

  const others = [...players.values()]
    .filter((p) => p.connected && p.id !== playerId && game.words.has(p.id))
    .map((p) => p.id);

  if (assignment.size !== others.length) return false;
  const targets = new Set(assignment.keys());
  const owners = new Set(assignment.values());
  if (targets.size !== others.length || owners.size !== others.length) return false;
  for (const id of others) {
    if (!targets.has(id) || !owners.has(id)) return false;
  }

  game.assignments.set(playerId, new Map(assignment));
  return true;
}

export function allConnectedSubmittedAssignments(game: InternalKdfGame, players: Map<string, Player>): boolean {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  return connectedIds.length > 0 && connectedIds.every((id) => game.assignments.has(id));
}

/** Scores the just-finished round for every player (10 pts per correct
 * guess, +5 bonus for a perfect round), adds it to cumulative totals, and
 * moves the game into "results". Call once allConnectedSubmittedAssignments
 * is true. */
export function revealRound(game: InternalKdfGame, players: Map<string, Player>): void {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  const results = new Map<string, KdfRoundResult>();

  for (const playerId of connectedIds) {
    const guess = game.assignments.get(playerId);
    if (!guess) continue;
    const entries: KdfRoundEntry[] = [...guess.entries()].map(([targetPlayerId, termOwnerId]) => ({
      targetPlayerId,
      termOwnerId,
      correct: targetPlayerId === termOwnerId,
    }));
    const correctCount = entries.filter((e) => e.correct).length;
    const allCorrect = entries.length > 0 && correctCount === entries.length;
    const points = correctCount * 10 + (allCorrect ? 5 : 0);
    results.set(playerId, { entries, correctCount, allCorrect, points });
    game.scores.set(playerId, (game.scores.get(playerId) ?? 0) + points);
  }

  game.lastRoundResults = results;
  game.stage = "results";
}

/** Host-triggered: advances from a round's results to the next round, or to
 * the final podium if that was the last round. */
export function nextRound(game: InternalKdfGame): boolean {
  if (game.stage !== "results") return false;
  if (game.round >= game.totalRounds) {
    game.stage = "finished";
    return true;
  }
  game.round += 1;
  const category = pickCategory(game.usedCategories);
  game.usedCategories.add(category);
  game.category = category;
  game.words = new Map();
  game.assignments = new Map();
  game.lastRoundResults = null;
  game.stage = "writing";
  return true;
}
