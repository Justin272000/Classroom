import { useState, type FormEvent } from "react";
import Avatar from "../components/Avatar";
import Lettering from "../components/Lettering";
import RoundTimer from "../components/RoundTimer";
import { findGame } from "../games";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("zeitbombe")!;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

const LOSE_REASON_TEXT: Record<string, string> = {
  timeout: "Die Zeit ist abgelaufen.",
  exploded: "Zu viele haben die Antwort angefochten — Bumm!",
  duplicate: "Diese Antwort gab es in dieser Runde schon.",
};

export default function ZeitbombeGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const [answerInput, setAnswerInput] = useState("");
  if (!game || game.id !== "zeitbombe") return null;

  const isMyTurn = game.stage === "answering" && game.turnPlayerId === myId;
  const isAnswerer = game.stage === "challenge" && game.pendingAnswer?.playerId === myId;
  const hasChallenged = myId ? game.challengedBy.includes(myId) : false;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!answerInput.trim()) return;
    socket.emit("zeitbombe:submit", { text: answerInput });
    setAnswerInput("");
  }

  function challenge() {
    socket.emit("zeitbombe:challenge");
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  const history = (
    <div className="zeitbombe-history">
      {game.history.length === 0 ? (
        <span className="hint">Noch keine Antworten in dieser Runde.</span>
      ) : (
        game.history.map((h, i) => (
          <span key={i} className="zeitbombe-history-item inline-player">
            <Avatar characterId={findPlayer(room, h.playerId).character} />
            {h.text}
          </span>
        ))
      )}
    </div>
  );

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} onClick={isHost ? backToLobby : undefined} />

      {room.phase === "playing" && (
        <>
          <div className="slf-category">{game.category}</div>
          <RoundTimer deadline={game.deadline} />

          {game.stage === "answering" && (
            <div className="card centered-content">
              {isMyTurn ? (
                <form onSubmit={submit}>
                  <label>
                    Dein Begriff
                    <input
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      maxLength={40}
                      placeholder="..."
                      autoFocus
                      required
                    />
                  </label>
                  <button type="submit">Bestätigen</button>
                </form>
              ) : (
                <p className="hint">
                  <span className="inline-player">
                    <Avatar characterId={findPlayer(room, game.turnPlayerId ?? "").character} />
                    {findPlayer(room, game.turnPlayerId ?? "").name}
                  </span>{" "}
                  ist dran …
                </p>
              )}
            </div>
          )}

          {game.stage === "challenge" && game.pendingAnswer && (
            <div className="card centered-content">
              <p className="zeitbombe-pending">
                <span className="inline-player">
                  <Avatar characterId={findPlayer(room, game.pendingAnswer.playerId).character} />
                  {findPlayer(room, game.pendingAnswer.playerId).name}
                </span>
                : „{game.pendingAnswer.text}“
              </p>
              {isAnswerer ? (
                <p className="hint">Die anderen können jetzt anfechten …</p>
              ) : hasChallenged ? (
                <p className="hint">Du hast angefochten. Warte auf die anderen …</p>
              ) : (
                <button className="secondary" onClick={challenge}>
                  Anfechten!
                </button>
              )}
              <p className="hint">
                {game.challengedBy.length} / {game.challengeThreshold} haben angefochten
              </p>
            </div>
          )}

          {history}
        </>
      )}

      {room.phase === "results" && (
        <div className="card centered-content">
          <h2>💥 {findPlayer(room, game.loserId ?? "").name} hat verloren!</h2>
          <p className="hint">{game.loseReason ? LOSE_REASON_TEXT[game.loseReason] : ""}</p>
          {history}
          {isHost ? (
            <div className="actions">
              <button onClick={next}>Nochmal spielen</button>
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
