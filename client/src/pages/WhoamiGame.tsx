import { useState, type FormEvent } from "react";
import Avatar from "../components/Avatar";
import Lettering from "../components/Lettering";
import { findGame } from "../games";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("whoami")!;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

function findPlayer(room: RoomState, id: string | null | undefined): Player | undefined {
  return id ? room.players.find((p) => p.id === id) : undefined;
}

function PlayerTag({ player }: { player: Player | undefined }) {
  if (!player) return null;
  return (
    <span className="inline-player">
      <Avatar characterId={player.character} />
      {player.name}
    </span>
  );
}

export default function WhoamiGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const [nameInput, setNameInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [guessInput, setGuessInput] = useState("");

  if (!game || game.id !== "whoami") return null;

  const questioner = findPlayer(room, game.currentPlayerId);
  const myAssignment = game.identities.find((i) => i.assignerId === myId);
  const questionerIdentity = game.identities.find((i) => i.targetId === game.currentPlayerId);
  const isQuestioner = myId === game.currentPlayerId;
  const iHaveVoted = myId ? game.votedIds.includes(myId) : false;

  function submitName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    socket.emit("whoami:assignName", { name: nameInput }, () => {});
    setNameInput("");
  }

  function submitQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!questionInput.trim()) return;
    socket.emit("whoami:ask", { question: questionInput });
    setQuestionInput("");
  }

  function submitGuess(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guessInput.trim()) return;
    socket.emit("whoami:guess", { guess: guessInput });
    setGuessInput("");
  }

  function vote(answer: boolean) {
    socket.emit("whoami:vote", { answer });
  }

  function confirmGuess(correct: boolean) {
    socket.emit("whoami:confirmGuess", { correct });
  }

  function continueTurn() {
    socket.emit("whoami:continue");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} />

      {game.stage === "assigning" && (
        <div className="card">
          <h2>Identitäten vergeben ({game.assignedSubmittedIds.length}/{game.identities.length})</h2>
          {myAssignment ? (
            game.assignedSubmittedIds.includes(myAssignment.targetId) ? (
              <p className="hint">
                Vergeben an <PlayerTag player={findPlayer(room, myAssignment.targetId)} /> — warte auf die
                anderen …
              </p>
            ) : (
              <form onSubmit={submitName}>
                <label>
                  Gib <PlayerTag player={findPlayer(room, myAssignment.targetId)} /> eine Identität
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={40}
                    placeholder="z.B. Albert Einstein"
                    autoFocus
                    required
                  />
                </label>
                <button type="submit">Vergeben</button>
              </form>
            )
          ) : (
            <p className="hint">Du bist in dieser Runde nicht dabei — nächste Runde bist du wieder mit dabei.</p>
          )}
        </div>
      )}

      {game.stage !== "assigning" && game.stage !== "finished" && (
        <>
          <p className="question">
            {isQuestioner ? "Du bist dran!" : (
              <>
                <PlayerTag player={questioner} /> ist dran
              </>
            )}
          </p>

          {!isQuestioner && questionerIdentity?.name && (
            <p className="hint whoami-identity">
              Identität: <strong>{questionerIdentity.name}</strong>
            </p>
          )}

          {game.stage === "asking" && isQuestioner && (
            <div className="card">
              <form onSubmit={submitQuestion}>
                <label>
                  Deine Ja/Nein-Frage
                  <input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    maxLength={200}
                    placeholder="Bin ich eine Person?"
                    autoFocus
                    required
                  />
                </label>
                <button type="submit">Frage stellen</button>
              </form>
              <hr className="divider" />
              <form onSubmit={submitGuess}>
                <label>
                  Oder direkt raten
                  <input
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    maxLength={60}
                    placeholder="Ich bin ..."
                    required
                  />
                </label>
                <button type="submit" className="secondary">
                  Ich hab's!
                </button>
              </form>
            </div>
          )}

          {game.stage === "asking" && !isQuestioner && (
            <p className="hint">Warte auf die Frage …</p>
          )}

          {game.stage === "voting" && (
            <div className="card">
              <p className="whoami-question-text">„{game.question}“</p>
              {isQuestioner ? (
                <p className="hint">
                  Warte auf Antworten … ({game.votedIds.length}/{game.eligibleVoterCount})
                </p>
              ) : iHaveVoted ? (
                <p className="hint">
                  Danke! Warte auf die anderen … ({game.votedIds.length}/{game.eligibleVoterCount})
                </p>
              ) : (
                <div className="answer-grid">
                  <button className="answer-tile yes" onClick={() => vote(true)}>
                    JA
                  </button>
                  <button className="answer-tile no" onClick={() => vote(false)}>
                    NEIN
                  </button>
                </div>
              )}
            </div>
          )}

          {game.stage === "revealed" && (
            <div className="card centered-content">
              <p className="whoami-question-text">„{game.question}“</p>
              <p className={`reveal-banner ${game.lastAnswer ? "yes" : "no"}`}>
                {game.lastAnswer ? "JA!" : "NEIN."}
              </p>
              {isQuestioner ? (
                <button onClick={continueTurn}>
                  {game.lastAnswer ? "Nächste Frage" : "Weiter"}
                </button>
              ) : (
                <p className="hint">Warte auf {questioner?.name ?? "die nächste Frage"} …</p>
              )}
            </div>
          )}

          {game.stage === "guessing" && (
            <div className="card centered-content">
              <p className="hint">
                Tipp von <PlayerTag player={questioner} />:
              </p>
              <p className="whoami-question-text">„{game.pendingGuess}“</p>
              {questionerIdentity?.assignerId === myId ? (
                <>
                  <p className="hint">War das richtig?</p>
                  <div className="actions">
                    <button onClick={() => confirmGuess(true)}>Richtig!</button>
                    <button className="secondary" onClick={() => confirmGuess(false)}>
                      Falsch, weiter raten
                    </button>
                  </div>
                </>
              ) : (
                <p className="hint">
                  Warte auf Bestätigung von{" "}
                  <PlayerTag player={findPlayer(room, questionerIdentity?.assignerId)} /> …
                </p>
              )}
            </div>
          )}
        </>
      )}

      {game.stage === "finished" && (
        <div className="card">
          <h2>Alle haben's erraten! 🎉</h2>
          <ul className="identity-reveal-list">
            {game.identities.map((i) => (
              <li key={i.targetId}>
                <PlayerTag player={findPlayer(room, i.targetId)} />
                <span className="identity-reveal-name">{i.name}</span>
                <span className="hint">
                  von <PlayerTag player={findPlayer(room, i.assignerId)} />
                </span>
              </li>
            ))}
          </ul>
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
