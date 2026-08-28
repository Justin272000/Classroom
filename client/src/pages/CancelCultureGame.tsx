import Lettering from "../components/Lettering";
import RoundTimer from "../components/RoundTimer";
import { findGame } from "../games";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { RoomState } from "../types";

const GAME = findGame("cancelculture")!;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

export default function CancelCultureGame({ room, myId, isHost }: Props) {
  const game = room.game;
  if (!game || game.id !== "cancelculture") return null;

  const hasVoted = myId ? game.votedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;

  function vote(answer: boolean) {
    socket.emit("cancelculture:vote", { answer });
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  const total = (game.results?.yes ?? 0) + (game.results?.no ?? 0);

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} />
      <p className="question">„{game.statement}“</p>

      {room.phase === "playing" && (
        <>
          {hasVoted ? (
            <p className="hint">
              Warte auf die anderen … ({game.votedPlayerIds.length}/{connectedCount})
            </p>
          ) : (
            <div className="card">
              <div className="answer-grid">
                <button className="answer-tile yes" onClick={() => vote(true)}>
                  JA!
                </button>
                <button className="answer-tile no" onClick={() => vote(false)}>
                  NEIN!
                </button>
              </div>
            </div>
          )}
          <RoundTimer deadline={game.deadline} />
        </>
      )}

      {room.phase === "results" && game.results && (
        <div className="card">
          <h2>Ergebnis</h2>
          <ul className="results-list">
            <li>
              <span className="results-name">JA!</span>
              <div className="bar-track">
                <div
                  className="bar-fill yes"
                  style={{ width: `${Math.max(4, (game.results.yes / Math.max(1, total)) * 100)}%` }}
                />
              </div>
              <span className="results-count">{game.results.yes}</span>
            </li>
            <li>
              <span className="results-name">NEIN!</span>
              <div className="bar-track">
                <div
                  className="bar-fill no"
                  style={{ width: `${Math.max(4, (game.results.no / Math.max(1, total)) * 100)}%` }}
                />
              </div>
              <span className="results-count">{game.results.no}</span>
            </li>
          </ul>
          {isHost ? (
            <div className="actions">
              <button onClick={next}>Nächstes Statement</button>
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
