import { useEffect, useRef, useState, type FormEvent } from "react";
import Avatar from "../components/Avatar";
import BigPlayerTile from "../components/BigPlayerTile";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

interface ScoreEntry {
  playerId: string;
  name: string;
  total: number;
}

const ROW_HEIGHT = 64;
const TRANSITION_MS = 2200;

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

function rankIndex(list: ScoreEntry[], playerId: string): number {
  const i = list.findIndex((s) => s.playerId === playerId);
  return i === -1 ? list.length : i;
}

export default function StadtLandFlussGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const slfGame = game?.id === "stadtlandfluss" ? game : undefined;

  const [wordInput, setWordInput] = useState("");
  // Snapshot of standings as they were *before* the round currently being
  // shown, so the leaderboard transition below has something to animate from.
  const roundStartScoresRef = useRef<ScoreEntry[]>(slfGame?.scores ?? []);
  const prevStageRef = useRef<string | undefined>(slfGame?.stage);
  const [transition, setTransition] = useState<{ from: ScoreEntry[]; to: ScoreEntry[] } | null>(null);
  const [flipped, setFlipped] = useState(false);

  // Every client (not just whoever clicked "Nächste Runde") reacts to leaving
  // "results" by showing a brief animated leaderboard before the next round
  // (or the final podium) appears.
  useEffect(() => {
    if (!slfGame) return;
    const leavingResults = prevStageRef.current === "results" && slfGame.stage !== "results";
    if (leavingResults) {
      setTransition({ from: roundStartScoresRef.current, to: slfGame.scores });
    }
    if (slfGame.stage === "writing") {
      roundStartScoresRef.current = slfGame.scores;
    }
    prevStageRef.current = slfGame.stage;
    // Only stage/round should retrigger this — scores always change in lockstep
    // with a stage change, and depending on the array itself would refire on
    // every unrelated update (e.g. someone else submitting a word).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slfGame?.stage, slfGame?.round]);

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

  if (!game || game.id !== "stadtlandfluss") return null;

  const hasSubmitted = myId ? game.submittedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;
  const isLastRound = game.round >= game.totalRounds;

  function submitWord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wordInput.trim()) return;
    socket.emit("stadtlandfluss:submitWord", { word: wordInput });
    setWordInput("");
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  if (transition) {
    const activeOrder = flipped ? transition.to : transition.from;
    return (
      <div className="page centered">
        <h1>Zwei Dumme, ein Gedanke</h1>
        <div className="card">
          <h2>Punktestand</h2>
          <div className="leaderboard-wrap" style={{ height: transition.to.length * ROW_HEIGHT }}>
            {transition.to.map((s) => {
              const player = findPlayer(room, s.playerId);
              const rank = rankIndex(transition.to, s.playerId);
              const top = rankIndex(activeOrder, s.playerId) * ROW_HEIGHT;
              return (
                <div
                  key={s.playerId}
                  className={`leaderboard-row podium-place place-${rank + 1}`}
                  style={{ top }}
                >
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
      </div>
    );
  }

  return (
    <div className="page centered">
      <h1>Zwei Dumme, ein Gedanke</h1>

      {game.stage !== "finished" && (
        <p className="slf-round">
          Runde {game.round} / {game.totalRounds}
        </p>
      )}

      {game.stage === "writing" && (
        <>
          <div className="slf-category">{game.category}</div>
          <div className="card centered-content">
            {hasSubmitted ? (
              <p className="hint">
                Warte auf die anderen … ({game.submittedPlayerIds.length}/{connectedCount})
              </p>
            ) : (
              <form onSubmit={submitWord}>
                <label>
                  Dein Wort
                  <input
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    maxLength={40}
                    placeholder="..."
                    autoFocus
                    required
                  />
                </label>
                <button type="submit">Absenden</button>
              </form>
            )}
          </div>
        </>
      )}

      {game.stage === "results" && (
        <>
          <div className="slf-category">{game.category}</div>
          <div className="big-tile-grid">
            {(game.lastRoundEntries ?? []).map((entry) => (
              <BigPlayerTile
                key={entry.playerId}
                player={findPlayer(room, entry.playerId)}
                value={entry.word ?? "–"}
                highlight={entry.points > 0}
                badge={entry.points > 0 ? `+${entry.points}` : undefined}
                badgeVariant="positive"
              />
            ))}
          </div>
          <div className="card centered-content">
            {isHost ? (
              <button onClick={next}>{isLastRound ? "Endauswertung anzeigen" : "Nächste Runde"}</button>
            ) : (
              <p className="hint">Warte auf den Host …</p>
            )}
          </div>
        </>
      )}

      {game.stage === "finished" && (
        <div className="card">
          <h2>Endauswertung</h2>
          <ol className="podium-list">
            {game.scores.map((s, i) => {
              const player = findPlayer(room, s.playerId);
              return (
                <li key={s.playerId} className={`podium-place place-${i + 1}`}>
                  <span className="podium-rank">{i + 1}.</span>
                  <span className="inline-player">
                    <Avatar characterId={player.character} />
                    {s.name}
                  </span>
                  <span className="podium-score">{s.total} Punkte</span>
                </li>
              );
            })}
          </ol>
          {isHost ? (
            <button onClick={backToLobby}>Zurück zur Lobby</button>
          ) : (
            <p className="hint">Warte auf den Host …</p>
          )}
        </div>
      )}
    </div>
  );
}
