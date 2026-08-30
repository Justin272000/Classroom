import { useEffect, useRef, useState, type FormEvent } from "react";
import AnimatedLeaderboard from "../components/AnimatedLeaderboard";
import Avatar from "../components/Avatar";
import BigPlayerTile from "../components/BigPlayerTile";
import Lettering from "../components/Lettering";
import { findGame } from "../games";
import { useLeaderboardTransition } from "../hooks/useLeaderboardTransition";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("zahlen")!;
const FEEDBACK_POPUP_MS = 2000;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

export default function ZahlenGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const zahlenGame = game?.id === "zahlen" ? game : undefined;

  const [guessInput, setGuessInput] = useState("");
  const [feedbackPopup, setFeedbackPopup] = useState<"higher" | "lower" | null>(null);
  const [lastGuess, setLastGuess] = useState<number | null>(null);

  // A new round means a new secret number, so the last round's reference
  // point would be misleading — clear it as soon as the round changes.
  useEffect(() => {
    setLastGuess(null);
  }, [zahlenGame?.round]);

  const { transition, flipped } = useLeaderboardTransition(
    zahlenGame?.stage,
    zahlenGame?.round,
    zahlenGame?.scores ?? [],
    "guessing",
    "results"
  );

  // Each completed attempt (this round's Nth guess, for everyone) produces a
  // fresh personalized "higher"/"lower" hint; the round+attempt+stage triple
  // is unique across the whole game, so it doubles as a key that guards
  // against re-showing the same popup on an unrelated re-render.
  const feedbackKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!zahlenGame || zahlenGame.myFeedback === null || zahlenGame.myFeedback === "correct") return;
    const key = `${zahlenGame.round}:${zahlenGame.attempt}:${zahlenGame.stage}`;
    if (feedbackKeyRef.current === key) return;
    feedbackKeyRef.current = key;
    setFeedbackPopup(zahlenGame.myFeedback);
    const timer = setTimeout(() => setFeedbackPopup(null), FEEDBACK_POPUP_MS);
    return () => clearTimeout(timer);
  }, [zahlenGame?.round, zahlenGame?.attempt, zahlenGame?.stage, zahlenGame?.myFeedback]);

  if (!game || game.id !== "zahlen") return null;

  const hasGuessed = myId ? game.submittedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;
  const isLastRound = game.round >= game.totalRounds;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(guessInput);
    if (!Number.isInteger(value) || value < 1 || value > 100) return;
    socket.emit("zahlen:submitGuess", { guess: value });
    setGuessInput("");
    setLastGuess(value);
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  if (transition) {
    return (
      <div className="page centered" style={pageBackgroundStyle(GAME.background, GAME.backgroundColor)}>
        <Lettering src={GAME.lettering} alt={GAME.name} onClick={isHost ? backToLobby : undefined} />
        <AnimatedLeaderboard transition={transition} flipped={flipped} findPlayer={(id) => findPlayer(room, id)} />
      </div>
    );
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background, GAME.backgroundColor)}>
      <Lettering src={GAME.lettering} alt={GAME.name} onClick={isHost ? backToLobby : undefined} />

      {game.stage !== "finished" && (
        <p className="slf-round">
          Runde {game.round} / {game.totalRounds} · Versuch {game.attempt} / {game.totalAttempts}
        </p>
      )}

      {feedbackPopup && (
        <div className={`zahlen-feedback-popup ${feedbackPopup}`}>
          {feedbackPopup === "higher" ? "Höher ↑" : "Niedriger ↓"}
        </div>
      )}

      {game.stage === "guessing" && (
        <div className="card centered-content">
          {lastGuess !== null && (
            <p className="hint">
              Deine letzte Zahl: <strong>{lastGuess}</strong>
            </p>
          )}
          {hasGuessed ? (
            <p className="hint">
              Warte auf die anderen … ({game.submittedPlayerIds.length}/{connectedCount})
            </p>
          ) : (
            <form onSubmit={submit}>
              <label>
                Deine Zahl (1–100)
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="z.B. 50"
                  autoFocus
                  required
                />
              </label>
              <button type="submit">Absenden</button>
            </form>
          )}
        </div>
      )}

      {game.stage === "results" && (
        <>
          {typeof game.answer === "number" && (
            <div className="guessit-answer-display">
              <span className="guessit-answer-label">Gesuchte Zahl</span>
              <span className="guessit-answer-value">{game.answer}</span>
            </div>
          )}

          <div className="big-tile-grid">
            {(game.lastRoundEntries ?? []).map((entry) => (
              <BigPlayerTile
                key={entry.playerId}
                player={findPlayer(room, entry.playerId)}
                value={entry.guess !== null ? String(entry.guess) : "–"}
                highlight={entry.closest}
                badge={entry.closest ? "+10" : undefined}
                badgeVariant="positive"
              />
            ))}
          </div>

          <div className="card centered-content">
            {isHost ? (
              <div className="actions">
                <button onClick={next}>{isLastRound ? "Endauswertung anzeigen" : "Nächste Runde"}</button>
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
