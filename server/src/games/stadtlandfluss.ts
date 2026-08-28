import type { Player } from "../types.js";

const CATEGORIES = [
  "Stadt",
  "Land",
  "Fluss",
  "Vorname",
  "Tier",
  "Beruf",
  "Farbe",
  "Automarke",
  "Obst oder Gemüse",
  "Filmtitel",
  "Pflanze",
  "Sportart",
];

export function pickCategory(exclude: Set<string> = new Set()): string {
  const pool = CATEGORIES.filter((c) => !exclude.has(c));
  const list = pool.length > 0 ? pool : CATEGORIES;
  return list[Math.floor(Math.random() * list.length)];
}

export type SlfStage = "writing" | "results" | "finished";

export interface InternalSlfGame {
  id: "stadtlandfluss";
  stage: SlfStage;
  round: number;
  totalRounds: number;
  category: string;
  usedCategories: Set<string>;
  words: Map<string, string>; // playerId -> raw submitted word, cleared each round
  scores: Map<string, number>; // playerId -> cumulative total
  lastRoundEntries: { playerId: string; word: string | null; points: number }[] | null;
}

export function startStadtLandFluss(connectedPlayerIds: string[]): InternalSlfGame | null {
  if (connectedPlayerIds.length < 2) return null;
  const usedCategories = new Set<string>();
  const category = pickCategory(usedCategories);
  usedCategories.add(category);
  return {
    id: "stadtlandfluss",
    stage: "writing",
    round: 1,
    totalRounds: 10,
    category,
    usedCategories,
    words: new Map(),
    scores: new Map(connectedPlayerIds.map((id) => [id, 0])),
    lastRoundEntries: null,
  };
}

export function submitWord(game: InternalSlfGame, playerId: string, word: string): boolean {
  if (game.stage !== "writing") return false;
  const trimmed = word.trim().slice(0, 40);
  if (!trimmed) return false;
  game.words.set(playerId, trimmed);
  return true;
}

export function allConnectedSubmitted(game: InternalSlfGame, players: Map<string, Player>): boolean {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  return connectedIds.length > 0 && connectedIds.every((id) => game.words.has(id));
}

// Spelling shouldn't matter for matching two answers — casing, umlaut spelling
// (ä/ae), and small typos should still count as "the same word".
function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function matchThreshold(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function wordsMatch(a: string, b: string): boolean {
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  if (na === nb) return true;
  return levenshtein(na, nb) <= Math.min(matchThreshold(na.length), matchThreshold(nb.length));
}

function groupByMatch(entries: { playerId: string; word: string }[]): string[][] {
  const groups: { rep: string; ids: string[] }[] = [];
  for (const { playerId, word } of entries) {
    const existing = groups.find((g) => wordsMatch(word, g.rep));
    if (existing) existing.ids.push(playerId);
    else groups.push({ rep: word, ids: [playerId] });
  }
  return groups.map((g) => g.ids);
}

/** Scores the just-finished round (fuzzy-matched groups of 2+ get 10 points
 * each, a lone answer gets 0), adds it to cumulative totals, and moves the
 * game into "results". Call once `allConnectedSubmitted` is true. */
export function revealRound(game: InternalSlfGame, players: Map<string, Player>): void {
  const connectedIds = [...players.values()].filter((p) => p.connected).map((p) => p.id);
  const withWords = connectedIds
    .map((playerId) => ({ playerId, word: game.words.get(playerId) ?? null }))
    .filter((e): e is { playerId: string; word: string } => !!e.word);

  const groups = groupByMatch(withWords);
  const pointsByPlayer = new Map<string, number>();
  for (const group of groups) {
    const points = group.length >= 2 ? 10 : 0;
    for (const id of group) pointsByPlayer.set(id, points);
  }

  game.lastRoundEntries = connectedIds.map((playerId) => {
    const word = game.words.get(playerId) ?? null;
    const points = pointsByPlayer.get(playerId) ?? 0;
    game.scores.set(playerId, (game.scores.get(playerId) ?? 0) + points);
    return { playerId, word, points };
  });
  game.stage = "results";
}

/** Host-triggered: starts the next round, or moves to "finished" if the
 * round that was just revealed was the last one. */
export function nextSlfRound(game: InternalSlfGame): boolean {
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
  game.lastRoundEntries = null;
  game.stage = "writing";
  return true;
}
