import { useState } from "react";
import Avatar from "../components/Avatar";
import CharacterCarousel from "../components/CharacterCarousel";
import QrCode from "../components/QrCode";
import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  room: RoomState;
  isHost: boolean;
  myId: string | undefined;
}

export default function Lobby({ room, isHost, myId }: Props) {
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const joinUrl = `${window.location.origin}/?code=${room.code}`;

  function startGame(gameId: "wwe" | "whoami") {
    setStartError(null);
    socket.emit("game:start", { gameId }, (res) => {
      if (!res.ok) setStartError(res.error);
    });
  }

  function copyLink() {
    const onCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    // navigator.clipboard needs a secure context (HTTPS or localhost) and is
    // undefined otherwise — the case for a friend on plain HTTP via LAN IP.
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl).then(onCopied).catch(() => {});
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = joinUrl;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      onCopied();
    } catch {
      // no copy mechanism available; the link/QR code still works manually.
    }
    document.body.removeChild(textarea);
  }

  return (
    <div className="page centered">
      <h1>Lobby</h1>
      <div className="room-code">
        Raumcode: <span>{room.code}</span>
      </div>
      <p className="subtitle">Teile den Code oder QR-Code mit deinen Freunden.</p>

      <div className="card centered-content">
        <QrCode value={joinUrl} />
        <button type="button" className="secondary" onClick={copyLink}>
          {copied ? "Link kopiert!" : "Link kopieren"}
        </button>
        <p className="hint">
          Scannen öffnet die App direkt mit ausgefülltem Code. Funktioniert nur, wenn diese Seite
          über die WLAN-Adresse dieses Geräts aufgerufen wurde (nicht "localhost").
        </p>
      </div>

      <div className="card">
        <h2>Spieler ({room.players.length})</h2>
        <ul className="player-list">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? "" : "disconnected"}>
              <Avatar characterId={p.character} />
              {p.name}
              {p.id === room.hostId && <span className="badge">Host</span>}
              {!p.connected && <span className="badge muted">getrennt</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Charakter wählen</h2>
        <CharacterCarousel players={room.players} myId={myId} />
      </div>

      <div className="card">
        <h2>Minispiel wählen</h2>
        <div className="game-grid">
          <button className="game-tile" disabled={!isHost} onClick={() => startGame("wwe")}>
            <strong>Wer würde eher</strong>
            <span>Abstimmen, wer am ehesten passt</span>
          </button>
          <button className="game-tile" disabled={!isHost} onClick={() => startGame("whoami")}>
            <strong>Wer bin ich</strong>
            <span>Identität erraten per Ja/Nein-Fragen</span>
          </button>
          <div className="game-tile disabled">
            <strong>Werwolf</strong>
            <span>Bald verfügbar</span>
          </div>
        </div>
        {!isHost && <p className="hint">Nur der Host kann ein Spiel starten.</p>}
        {startError && <p className="error">{startError}</p>}
      </div>
    </div>
  );
}
