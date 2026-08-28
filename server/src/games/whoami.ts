import type { Player } from "../types.js";

export type WhoamiStage = "assigning" | "asking" | "voting" | "revealed" | "guessing" | "finished";

export interface WhoamiAssignment {
  targetId: string;
  assignerId: string;
  name: string | null;
}

export interface InternalWhoamiGame {
  id: "whoami";
  assignments: WhoamiAssignment[];
  turnOrder: string[];
  turnIndex: number;
  stage: WhoamiStage;
  question: string | null;
  votes: Map<string, boolean>;
  pendingGuess: string | null;
  lastAnswer: boolean | null;
  solved: Set<string>;
}

/** Builds a single-cycle derangement (assigner[i] names target[i+1]) so nobody
 * ever names themselves, then shuffles first so the cycle order isn't guessable. */
export function startWhoami(connectedPlayerIds: string[]): InternalWhoamiGame | null {
  if (connectedPlayerIds.length < 2) return null;
  const shuffled = [...connectedPlayerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const n = shuffled.length;
  const assignments: WhoamiAssignment[] = shuffled.map((assignerId, i) => ({
    assignerId,
    targetId: shuffled[(i + 1) % n],
    name: null,
  }));
  return {
    id: "whoami",
    assignments,
    turnOrder: shuffled,
    turnIndex: 0,
    stage: "assigning",
    question: null,
    votes: new Map(),
    pendingGuess: null,
    lastAnswer: null,
    solved: new Set(),
  };
}

export function currentPlayerId(game: InternalWhoamiGame): string | null {
  return game.turnOrder[game.turnIndex] ?? null;
}

function assignmentForTarget(game: InternalWhoamiGame, targetId: string): WhoamiAssignment | undefined {
  return game.assignments.find((a) => a.targetId === targetId);
}

function assignmentForAssigner(game: InternalWhoamiGame, assignerId: string): WhoamiAssignment | undefined {
  return game.assignments.find((a) => a.assignerId === assignerId);
}

export function submitAssignment(game: InternalWhoamiGame, assignerId: string, name: string): boolean {
  if (game.stage !== "assigning") return false;
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return false;
  const assignment = assignmentForAssigner(game, assignerId);
  if (!assignment) return false;
  assignment.name = trimmed;
  if (game.assignments.every((a) => a.name !== null)) {
    game.stage = "asking";
  }
  return true;
}

/** Next player after `fromIndex` (cyclically) who is connected and hasn't
 * already solved their identity. Falls back to `fromIndex` itself if nobody
 * else qualifies — e.g. everyone else is solved or disconnected. */
function nextEligibleIndex(game: InternalWhoamiGame, players: Map<string, Player>, fromIndex: number): number {
  const n = game.turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    const pid = game.turnOrder[idx];
    if (game.solved.has(pid)) continue;
    if (!players.get(pid)?.connected) continue;
    return idx;
  }
  return fromIndex;
}

export function eligibleVoterCount(game: InternalWhoamiGame, players: Map<string, Player>): number {
  const questioner = currentPlayerId(game);
  return [...players.values()].filter((p) => p.connected && p.id !== questioner).length;
}

export function askQuestion(game: InternalWhoamiGame, askerId: string, question: string): boolean {
  if (game.stage !== "asking") return false;
  if (currentPlayerId(game) !== askerId) return false;
  const trimmed = question.trim().slice(0, 200);
  if (!trimmed) return false;
  game.question = trimmed;
  game.votes = new Map();
  game.stage = "voting";
  return true;
}

export function submitVote(
  game: InternalWhoamiGame,
  voterId: string,
  answer: boolean,
  players: Map<string, Player>
): boolean {
  if (game.stage !== "voting") return false;
  const questioner = currentPlayerId(game);
  if (voterId === questioner) return false;
  if (!players.get(voterId)?.connected) return false;
  game.votes.set(voterId, answer);

  const eligible = [...players.values()].filter((p) => p.connected && p.id !== questioner);
  const allVoted = eligible.length > 0 && eligible.every((p) => game.votes.has(p.id));
  if (allVoted) {
    let yes = 0;
    let no = 0;
    for (const v of game.votes.values()) v ? yes++ : no++;
    game.lastAnswer = yes > no; // a tie counts as "no"
    game.stage = "revealed";
  }
  return true;
}

export function continueAfterReveal(
  game: InternalWhoamiGame,
  playerId: string,
  players: Map<string, Player>
): boolean {
  if (game.stage !== "revealed") return false;
  if (currentPlayerId(game) !== playerId) return false;
  const wasYes = game.lastAnswer === true;
  game.question = null;
  game.votes = new Map();
  game.lastAnswer = null;
  if (!wasYes) {
    game.turnIndex = nextEligibleIndex(game, players, game.turnIndex);
  }
  game.stage = "asking";
  return true;
}

export function submitGuess(game: InternalWhoamiGame, questionerId: string, guess: string): boolean {
  if (game.stage !== "asking") return false;
  if (currentPlayerId(game) !== questionerId) return false;
  const trimmed = guess.trim().slice(0, 60);
  if (!trimmed) return false;
  game.pendingGuess = trimmed;
  game.stage = "guessing";
  return true;
}

export function confirmGuess(
  game: InternalWhoamiGame,
  confirmerId: string,
  correct: boolean,
  players: Map<string, Player>
): boolean {
  if (game.stage !== "guessing") return false;
  const questioner = currentPlayerId(game);
  const assignment = questioner ? assignmentForTarget(game, questioner) : undefined;
  if (!assignment || assignment.assignerId !== confirmerId) return false;

  game.pendingGuess = null;
  game.question = null;
  game.votes = new Map();
  game.lastAnswer = null;

  if (correct && questioner) {
    game.solved.add(questioner);
    const allSolved = game.turnOrder.every((pid) => game.solved.has(pid));
    if (allSolved) {
      game.stage = "finished";
      return true;
    }
    game.turnIndex = nextEligibleIndex(game, players, game.turnIndex);
  }
  game.stage = "asking";
  return true;
}
