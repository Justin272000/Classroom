import { useEffect, useRef, useState } from "react";

export interface ScoreEntry {
  playerId: string;
  name: string;
  total: number;
}

const TRANSITION_MS = 2200;

/** Any rounds-based game with a cumulative leaderboard can reuse this instead
 * of re-deriving the FLIP-animation bookkeeping: watches `stage`/`round` and
 * snapshots `scores` whenever `stage` is `snapshotStage` (typically the
 * writing/answering stage a round starts in), then produces a brief
 * from-snapshot-to-current transition every time `stage` leaves
 * `leavingStage` (typically the stage a round's outcome was just shown in).
 * Every client renders this independently by watching its own state change —
 * not just whoever triggered the advance — so nobody misses the animation. */
export function useLeaderboardTransition(
  stage: string | undefined,
  round: number | undefined,
  scores: ScoreEntry[],
  snapshotStage: string,
  leavingStage: string
): { transition: { from: ScoreEntry[]; to: ScoreEntry[] } | null; flipped: boolean } {
  const roundStartScoresRef = useRef<ScoreEntry[]>(scores);
  const prevStageRef = useRef<string | undefined>(stage);
  const [transition, setTransition] = useState<{ from: ScoreEntry[]; to: ScoreEntry[] } | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (stage === undefined) return;
    const leaving = prevStageRef.current === leavingStage && stage !== leavingStage;
    if (leaving) {
      setTransition({ from: roundStartScoresRef.current, to: scores });
    }
    if (stage === snapshotStage) {
      roundStartScoresRef.current = scores;
    }
    prevStageRef.current = stage;
    // Only stage/round should retrigger this — scores always change in lockstep
    // with a stage change, and depending on the array itself would refire on
    // every unrelated update (e.g. someone else submitting).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, round]);

  useEffect(() => {
    if (!transition) {
      setFlipped(false);
      return;
    }
    setFlipped(false);
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipped(true));
    });
    const timer = setTimeout(() => setTransition(null), TRANSITION_MS);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timer);
    };
  }, [transition]);

  return { transition, flipped };
}
