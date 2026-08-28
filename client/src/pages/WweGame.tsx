import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

export default function WweGame({ room, myId, isHost }: Props) {
  const game = room.game;
  if (!game) return null;

  const hasVoted = myId ? game.votedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;

  function vote(targetPlayerId: string) {
    socket.emit("wwe:vote", { targetPlayerId });
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  return (
    <div className="page centered">
      <h1>Wer würde eher…</h1>
      <p className="question">{game.question}</p>

      {room.phase === "playing" && (
        <>
          <div className="card">
            <div className="player-grid">
              {room.players.map((p) => (
                <button
                  key={p.id}
                  className="player-tile"
                  disabled={hasVoted || !p.connected}
                  onClick={() => vote(p.id)}
                >
                  <span className="player-avatar">{p.character ?? "❔"}</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">
            {hasVoted
              ? `Warte auf die anderen … (${game.votedPlayerIds.length}/${connectedCount})`
              : "Wähle, wer am ehesten passt."}
          </p>
        </>
      )}

      {room.phase === "results" && game.results && (
        <div className="card">
          <h2>Ergebnis</h2>
          <ul className="results-list">
            {game.results.map((r) => (
              <li key={r.playerId}>
                <span className="results-name">
                  <span className="player-avatar">
                    {room.players.find((p) => p.id === r.playerId)?.character ?? "❔"}
                  </span>
                  {r.name}
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(6, (r.votes / Math.max(1, connectedCount)) * 100)}%` }}
                  />
                </div>
                <span className="results-count">{r.votes}</span>
              </li>
            ))}
          </ul>
          {isHost ? (
            <div className="actions">
              <button onClick={next}>Nächste Frage</button>
              <button className="secondary" onClick={backToLobby}>
                Zurück zur Lobby
              </button>
            </div>
          ) : (
            <p className="hint">Warte auf den Host …</p>
          )}
        </div>
      )}
    </div>
  );
}
