import { useState, type FormEvent } from "react";
import AnimatedLeaderboard from "../components/AnimatedLeaderboard";
import Avatar from "../components/Avatar";
import BigPlayerTile from "../components/BigPlayerTile";
import Lettering from "../components/Lettering";
import { findGame } from "../games";
import { useLeaderboardTransition } from "../hooks/useLeaderboardTransition";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("stadtlandfluss")!;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

export default function StadtLandFlussGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const slfGame = game?.id === "stadtlandfluss" ? game : undefined;

  const [wordInput, setWordInput] = useState("");
  const { transition, flipped } = useLeaderboardTransition(
    slfGame?.stage,
    slfGame?.round,
    slfGame?.scores ?? [],
    "writing",
    "results"
  );

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
    return (
      <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
        <Lettering src={GAME.lettering} alt={GAME.name} />
        <AnimatedLeaderboard transition={transition} flipped={flipped} findPlayer={(id) => findPlayer(room, id)} />
      </div>
    );
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} />

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
