import { useState, type FormEvent } from "react";
import BigPlayerTile from "../components/BigPlayerTile";
import Lettering from "../components/Lettering";
import { findGame } from "../games";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("guessit")!;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

export default function GuessItGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const [guessInput, setGuessInput] = useState("");
  if (!game || game.id !== "guessit") return null;

  const hasGuessed = myId ? game.guessedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(guessInput);
    if (guessInput.trim() === "" || Number.isNaN(value)) return;
    socket.emit("guessit:submit", { guess: value });
    setGuessInput("");
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  const results = game.results ?? [];
  let closestId: string | null = null;
  if (typeof game.answer === "number" && results.length > 0) {
    let bestDiff = Infinity;
    for (const r of results) {
      const diff = Math.abs(r.guess - game.answer);
      if (diff < bestDiff) {
        bestDiff = diff;
        closestId = r.playerId;
      }
    }
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} />
      <p className="question">{game.question}</p>

      {room.phase === "playing" && (
        <div className="card centered-content">
          {hasGuessed ? (
            <p className="hint">
              Warte auf die anderen … ({game.guessedPlayerIds.length}/{connectedCount})
            </p>
          ) : (
            <form onSubmit={submit}>
              <label>
                Deine Schätzung {game.unit && `(${game.unit})`}
                <input
                  type="number"
                  inputMode="decimal"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="z.B. 12345"
                  autoFocus
                  required
                />
              </label>
              <button type="submit">Schätzen</button>
            </form>
          )}
        </div>
      )}

      {room.phase === "results" && (
        <>
          {typeof game.answer === "number" && (
            <div className="guessit-answer-display">
              <span className="guessit-answer-label">Richtige Antwort</span>
              <span className="guessit-answer-value">
                {game.answer.toLocaleString("de-DE")} {game.unit}
              </span>
            </div>
          )}

          <div className="big-tile-grid">
            {results.map((r) => (
              <BigPlayerTile
                key={r.playerId}
                player={findPlayer(room, r.playerId)}
                value={r.guess.toLocaleString("de-DE")}
                highlight={r.playerId === closestId}
              />
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
