import type { Player } from "../types.js";


export type ZahlenStage = "guessing" | "results" | "finished";
export type ZahlenFeedback = "higher" | "lower" | "correct";

export interface ZahlenRoundEntry {
  playerId: string;
  guess: number | null;
  closest: boolean;
  points: number;
}

export interface InternalZahlenGame {
  id: "zahlen";
  stage: ZahlenStage;
  round: number;
  totalRounds: number;
  attempt: number;
  totalAttempts: number;
  target: number;
  guesses: Map<string, number>; // playerId -> this attempt's guess, cleared each attempt
  lastFeedback: Map<string, ZahlenFeedback>; // playerId -> feedback for the attempt that just completed
  scores: Map<string, number>;
  lastRoundEntries: ZahlenRoundEntry[] | null;
}

function randomTarget(): number {
  return 1 + Math.floor(Math.random() * 100);
}

export function startZahlen(connectedPlayerIds: string[]): InternalZahlenGame {
  return {
    id: "zahlen",
    stage: "guessing",
    round: 1,
    totalRounds: 10,
    attempt: 1,
    totalAttempts: 3,
    target: randomTarget(),
    guesses: new Map(),
    lastFeedback: new Map(),
    scores: new Map(connectedPlayerIds.map((id) => [id, 0])),
    lastRoundEntries: null,
  };
}

export function submitGuess(game: InternalZahlenGame, playerId: string, guess: number): boolean {
  if (game.stage !== "guessing") return false;
  if (!Number.isInteger(guess) || guess < 1 || guess > 100) return false;
  game.guesses.set(playerId, guess);
  return true;
}

export function allConnectedSubmitted(game: InternalZahlenGame, players: Map<string, Player>): boolean {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  return connectedIds.length > 0 && connectedIds.every((id) => game.guesses.has(id));
}

/** Scores the just-completed attempt's guesses against the target and either
 * opens the next attempt or, after the last one, resolves the round: the
 * player(s) closest to the target with their final attempt get 10 points
 * (ties share the win). Call once `allConnectedSubmitted` is true. */
export function advanceAttempt(game: InternalZahlenGame, players: Map<string, Player>): void {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);

  const feedback = new Map<string, ZahlenFeedback>();
  for (const id of connectedIds) {
    const guess = game.guesses.get(id);
    if (guess === undefined) continue;
    feedback.set(id, guess < game.target ? "higher" : guess > game.target ? "lower" : "correct");
  }
  game.lastFeedback = feedback;

  if (game.attempt < game.totalAttempts) {
    game.attempt += 1;
    game.guesses = new Map();
    return;
  }

  const withGuesses = connectedIds
    .map((playerId) => ({ playerId, guess: game.guesses.get(playerId) ?? null }))
    .filter((e): e is { playerId: string; guess: number } => e.guess !== null);

  let bestDiff = Infinity;
  for (const { guess } of withGuesses) {
    bestDiff = Math.min(bestDiff, Math.abs(guess - game.target));
  }

  game.lastRoundEntries = connectedIds.map((playerId) => {
    const guess = game.guesses.get(playerId) ?? null;
    const closest = guess !== null && Math.abs(guess - game.target) === bestDiff;
    const points = closest ? 10 : 0;
    if (points > 0) game.scores.set(playerId, (game.scores.get(playerId) ?? 0) + points);
    return { playerId, guess, closest, points };
  });
  game.stage = "results";
}

/** Host-triggered: starts the next round, or moves to "finished" if the
 * round that was just revealed was the last one. */
export function nextZahlenRound(game: InternalZahlenGame): boolean {
  if (game.stage !== "results") return false;
  if (game.round >= game.totalRounds) {
    game.stage = "finished";
    return true;
  }
  game.round += 1;
  game.attempt = 1;
  game.target = randomTarget();
  game.guesses = new Map();
  game.lastFeedback = new Map();
  game.lastRoundEntries = null;
  game.stage = "guessing";
  return true;
}
