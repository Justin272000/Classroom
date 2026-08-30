import { useEffect, useState } from "react";
import BigPlayerTile from "../components/BigPlayerTile";
import CharacterCarousel from "../components/CharacterCarousel";
import GameCarousel from "../components/GameCarousel";
import Lettering from "../components/Lettering";
import QrCode from "../components/QrCode";
import { pageBackgroundStyle } from "../pageBackground";
import { buyPremiumTest, fetchPurchaseStatus, purchasesAvailable } from "../purchases";
import { socket } from "../socket";
import type { GameId, RoomState } from "../types";

interface Props {
  room: RoomState;
  isHost: boolean;
  myId: string | undefined;
  background: string;
  onLeave: () => void;
}

export default function Lobby({ room, isHost, myId, background, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const joinUrl = `${window.location.origin}/?code=${room.code}`;

  useEffect(() => {
    if (myId) fetchPurchaseStatus(myId).then(setPurchased);
  }, [myId]);

  async function handleBuy() {
    if (!myId) return;
    setPurchaseBusy(true);
    setPurchaseError(null);
    const res = await buyPremiumTest(myId);
    setPurchaseBusy(false);
    if (res.ok) setPurchased(true);
    else setPurchaseError(res.error);
  }

  function startGame(gameId: GameId) {
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
    <div className="page centered" style={pageBackgroundStyle(background)}>
      <Lettering src="/lettering/lobby.webp" alt="Lobby" />
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
        <div className="big-tile-grid">
          {room.players.map((p) => (
            <BigPlayerTile
              key={p.id}
              player={p}
              dimmed={!p.connected}
              badge={p.id === room.hostId ? "Host" : !p.connected ? "Getrennt" : undefined}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Charakter wählen</h2>
        <CharacterCarousel players={room.players} myId={myId} />
      </div>

      <div className="card">
        <h2>Minispiel wählen</h2>
        <GameCarousel isHost={isHost} onStart={startGame} error={startError} />
      </div>

      {isHost && (purchasesAvailable() || purchased) && (
        <div className="card centered-content">
          <h2>TEST: Premium (Zahlen)</h2>
          {purchased ? (
            <p>Freigeschaltet ✅</p>
          ) : (
            <button type="button" onClick={handleBuy} disabled={purchaseBusy}>
              {purchaseBusy ? "…" : "Kaufen (Test)"}
            </button>
          )}
          {purchaseError && <p className="error">{purchaseError}</p>}
        </div>
      )}

      <div className="card centered-content">
        <button type="button" className="secondary" onClick={onLeave}>
          Lobby verlassen
        </button>
      </div>
    </div>
  );
}
