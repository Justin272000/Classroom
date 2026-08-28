import { useState, type FormEvent } from "react";
import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
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
  const maxValue = Math.max(game.answer ?? 0, ...results.map((r) => Math.abs(r.guess)), 1);

  return (
    <div className="page centered">
      <h1>Guess it!</h1>
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
        <div className="card">
          <h2>Auflösung</h2>
          <ul className="results-list">
            {typeof game.answer === "number" && (
              <li className="guessit-answer-row">
                <span className="results-name">Antwort</span>
                <div className="bar-track">
                  <div className="bar-fill answer" style={{ width: `${(game.answer / maxValue) * 100}%` }} />
                </div>
                <span className="results-count">
                  {game.answer.toLocaleString("de-DE")} {game.unit}
                </span>
              </li>
            )}
            {results.map((r) => (
              <li key={r.playerId}>
                <span className="results-name">{r.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(4, (Math.abs(r.guess) / maxValue) * 100)}%` }}
                  />
                </div>
                <span className="results-count">{r.guess.toLocaleString("de-DE")}</span>
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
