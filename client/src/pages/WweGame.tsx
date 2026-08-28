import BigPlayerTile from "../components/BigPlayerTile";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

export default function WweGame({ room, myId, isHost }: Props) {
  const game = room.game;
  if (!game || game.id !== "wwe") return null;

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

  const results = game.results ?? [];
  const maxVotes = results.length > 0 ? Math.max(...results.map((r) => r.votes)) : 0;
  const winners = results.filter((r) => r.votes === maxVotes && maxVotes > 0);

  return (
    <div className="page centered">
      <h1>Wer würde eher…</h1>
      <p className="question">{game.question}</p>

      {room.phase === "playing" && (
        <>
          <div className="big-tile-grid">
            {room.players.map((p) => (
              <BigPlayerTile
                key={p.id}
                player={p}
                disabled={hasVoted || !p.connected}
                onClick={() => vote(p.id)}
              />
            ))}
          </div>
          <p className="hint">
            {hasVoted
              ? `Warte auf die anderen … (${game.votedPlayerIds.length}/${connectedCount})`
              : "Wähle, wer am ehesten passt."}
          </p>
        </>
      )}

      {room.phase === "results" && (
        <>
          <div className="big-tile-grid">
            {winners.map((r) => (
              <BigPlayerTile key={r.playerId} player={findPlayer(room, r.playerId)} highlight />
            ))}
          </div>
          <div className="card centered-content">
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
        </>
      )}
    </div>
  );
}
