import { useState, type FormEvent } from "react";
import Avatar from "../components/Avatar";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

export default function StadtLandFlussGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const [wordInput, setWordInput] = useState("");
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
          <div className="card">
            <h2>Auflösung</h2>
            <ul className="identity-reveal-list">
              {(game.lastRoundEntries ?? []).map((entry) => {
                const player = findPlayer(room, entry.playerId);
                return (
                  <li key={entry.playerId}>
                    <span className="inline-player">
                      <Avatar characterId={player?.character} />
                      {player?.name ?? "?"}
                    </span>
                    <span className="identity-reveal-name">{entry.word ?? "–"}</span>
                    <span className={`slf-points${entry.points > 0 ? " scored" : ""}`}>
                      +{entry.points}
                    </span>
                  </li>
                );
              })}
            </ul>
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
                    <Avatar characterId={player?.character} />
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
