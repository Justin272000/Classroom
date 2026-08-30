import Avatar from "./Avatar";
import type { ScoreEntry } from "../hooks/useLeaderboardTransition";
import type { Player } from "../types";

const ROW_HEIGHT = 64;

interface Props {
  transition: { from: ScoreEntry[]; to: ScoreEntry[] };
  flipped: boolean;
  findPlayer: (id: string) => Player;
}

function rankIndex(list: ScoreEntry[], playerId: string): number {
  const i = list.findIndex((s) => s.playerId === playerId);
  return i === -1 ? list.length : i;
}

export default function AnimatedLeaderboard({ transition, flipped, findPlayer }: Props) {
  const activeOrder = flipped ? transition.to : transition.from;
  return (
    <div className="card">
      <h2>Punktestand</h2>
      <div className="leaderboard-wrap" style={{ height: transition.to.length * ROW_HEIGHT }}>
        {transition.to.map((s) => {
          const player = findPlayer(s.playerId);
          const rank = rankIndex(transition.to, s.playerId);
          const top = rankIndex(activeOrder, s.playerId) * ROW_HEIGHT;
          return (
            <div key={s.playerId} className={`leaderboard-row podium-place place-${rank + 1}`} style={{ top }}>
              <span className="podium-rank">{rank + 1}.</span>
              <span className="inline-player">
                <Avatar characterId={player.character} />
                {s.name}
              </span>
              <span className="podium-score">{s.total} Punkte</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
