import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  room: RoomState;
  isHost: boolean;
}

export default function Lobby({ room, isHost }: Props) {
  function startWwe() {
    socket.emit("game:start", { gameId: "wwe" });
  }

  return (
    <div className="page centered">
      <h1>Lobby</h1>
      <div className="room-code">
        Raumcode: <span>{room.code}</span>
      </div>
      <p className="subtitle">Teile den Code mit deinen Freunden.</p>

      <div className="card">
        <h2>Spieler ({room.players.length})</h2>
        <ul className="player-list">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? "" : "disconnected"}>
              {p.name}
              {p.id === room.hostId && <span className="badge">Host</span>}
              {!p.connected && <span className="badge muted">getrennt</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Minispiel wählen</h2>
        <div className="game-grid">
          <button className="game-tile" disabled={!isHost} onClick={startWwe}>
            <strong>Wer würde eher</strong>
            <span>Abstimmen, wer am ehesten passt</span>
          </button>
          <div className="game-tile disabled">
            <strong>Werwolf</strong>
            <span>Bald verfügbar</span>
          </div>
          <div className="game-tile disabled">
            <strong>Wer bin ich</strong>
            <span>Bald verfügbar</span>
          </div>
        </div>
        {!isHost && <p className="hint">Nur der Host kann ein Spiel starten.</p>}
      </div>
    </div>
  );
}
