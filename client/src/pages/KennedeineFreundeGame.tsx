import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import AnimatedLeaderboard from "../components/AnimatedLeaderboard";
import Avatar from "../components/Avatar";
import BigPlayerTile from "../components/BigPlayerTile";
import Lettering from "../components/Lettering";
import { findGame } from "../games";
import { useLeaderboardTransition } from "../hooks/useLeaderboardTransition";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { Player, RoomState } from "../types";

const GAME = findGame("kennedeinefreunde")!;
const BONUS_POPUP_MS = 2200;

interface Props {
  room: RoomState;
  myId: string | undefined;
  isHost: boolean;
}

interface DragState {
  ownerId: string;
  pointerId: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

function findPlayer(room: RoomState, id: string): Player {
  return room.players.find((p) => p.id === id) ?? { id, name: "?", connected: true, character: null };
}

export default function KennedeineFreundeGame({ room, myId, isHost }: Props) {
  const game = room.game;
  const kdfGame = game?.id === "kennedeinefreunde" ? game : undefined;

  const [wordInput, setWordInput] = useState("");
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  const [workingAssignment, setWorkingAssignment] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showBonusPopup, setShowBonusPopup] = useState(false);

  const { transition, flipped } = useLeaderboardTransition(
    kdfGame?.stage,
    kdfGame?.round,
    kdfGame?.scores ?? [],
    "writing",
    "results"
  );

  // Fresh shuffle + a clean slate for the drag-drop working state each time a
  // new round's assigning phase begins — but not on every broadcast during
  // that phase (e.g. another player confirming their own guess), so nobody's
  // in-progress arrangement gets wiped out from under them.
  useEffect(() => {
    if (kdfGame?.stage === "assigning") {
      const ids = kdfGame.termsToAssign.map((t) => t.ownerId);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledOrder(ids);
      setWorkingAssignment({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kdfGame?.round, kdfGame?.stage]);

  const bonusShownForRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (kdfGame?.stage === "results" && kdfGame.myResult?.allCorrect && bonusShownForRoundRef.current !== kdfGame.round) {
      bonusShownForRoundRef.current = kdfGame.round;
      setShowBonusPopup(true);
      const timer = setTimeout(() => setShowBonusPopup(false), BONUS_POPUP_MS);
      return () => clearTimeout(timer);
    }
  }, [kdfGame?.stage, kdfGame?.round, kdfGame?.myResult]);

  if (!game || game.id !== "kennedeinefreunde") return null;

  const hasSubmittedWord = myId ? game.submittedPlayerIds.includes(myId) : false;
  const hasConfirmedAssignment = myId ? game.assignedPlayerIds.includes(myId) : false;
  const connectedCount = room.players.filter((p) => p.connected).length;
  const isLastRound = game.round >= game.totalRounds;

  function textFor(ownerId: string): string {
    return kdfGame?.termsToAssign.find((t) => t.ownerId === ownerId)?.text ?? "";
  }

  function submitWord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wordInput.trim()) return;
    socket.emit("kennedeinefreunde:submitWord", { word: wordInput });
    setWordInput("");
  }

  function startDrag(e: ReactPointerEvent<HTMLDivElement>, ownerId: string) {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    setDrag({
      ownerId,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
    });
  }

  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    setDrag((d) => (d && e.pointerId === d.pointerId ? { ...d, x: e.clientX, y: e.clientY } : d));
  }

  function onDragEnd(e: ReactPointerEvent<HTMLDivElement>) {
    setDrag((d) => {
      if (!d || e.pointerId !== d.pointerId) return d;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetId = el?.closest("[data-player-tile]")?.getAttribute("data-player-tile");
      const overPool = !!el?.closest("[data-kdf-pool]");

      if (targetId) {
        setWorkingAssignment((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) if (next[k] === d.ownerId) delete next[k];
          next[targetId] = d.ownerId;
          return next;
        });
      } else if (overPool) {
        setWorkingAssignment((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) if (next[k] === d.ownerId) delete next[k];
          return next;
        });
      }
      return null;
    });
  }

  function confirmAssignment() {
    socket.emit("kennedeinefreunde:submitAssignment", { assignment: workingAssignment });
  }

  function next() {
    socket.emit("game:next");
  }

  function backToLobby() {
    socket.emit("game:end");
  }

  const assignedOwnerIds = new Set(Object.values(workingAssignment));
  const poolOwnerIds = shuffledOrder.filter((id) => !assignedOwnerIds.has(id));
  const otherPlayers = room.players.filter((p) => p.id !== myId && game.termsToAssign.some((t) => t.ownerId === p.id));

  function chip(ownerId: string) {
    return (
      <div
        key={ownerId}
        className="kdf-term-chip"
        onPointerDown={(e) => startDrag(e, ownerId)}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        {textFor(ownerId)}
      </div>
    );
  }

  if (transition) {
    return (
      <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
        <Lettering src={GAME.lettering} alt={GAME.name} />
        <AnimatedLeaderboard transition={transition} flipped={flipped} findPlayer={(id) => findPlayer(room, id)} />
      </div>
    );
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(GAME.background)}>
      <Lettering src={GAME.lettering} alt={GAME.name} />

      {game.stage !== "finished" && (
        <p className="slf-round">
          Runde {game.round} / {game.totalRounds}
        </p>
      )}

      {game.stage === "writing" && (
        <>
          <div className="slf-category">{game.category}</div>
          <div className="card centered-content">
            {hasSubmittedWord ? (
              <p className="hint">
                Warte auf die anderen … ({game.submittedPlayerIds.length}/{connectedCount})
              </p>
            ) : (
              <form onSubmit={submitWord}>
                <label>
                  Dein erster Gedanke
                  <input
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    maxLength={30}
                    placeholder="..."
                    autoFocus
                    required
                  />
                </label>
                <button type="submit">Absenden</button>
              </form>
            )}
          </div>
        </>
      )}

      {game.stage === "assigning" && (
        <>
          <div className="slf-category">{game.category}</div>
          {hasConfirmedAssignment ? (
            <div className="card centered-content">
              <p className="hint">
                Warte auf die anderen … ({game.assignedPlayerIds.length}/{connectedCount})
              </p>
            </div>
          ) : (
            <>
              <p className="hint">Ordne die Begriffe per Drag &amp; Drop den richtigen Personen zu.</p>
              <div className="kdf-pool" data-kdf-pool>
                {poolOwnerIds.length === 0 ? (
                  <span className="hint">Alle Begriffe zugeordnet!</span>
                ) : (
                  poolOwnerIds.map((id) => chip(id))
                )}
              </div>
              <div className="big-tile-grid">
                {otherPlayers.map((p) => {
                  const assignedOwnerId = workingAssignment[p.id];
                  return (
                    <BigPlayerTile key={p.id} player={p} dropTargetId={p.id}>
                      <div className="kdf-drop-slot">
                        {assignedOwnerId ? chip(assignedOwnerId) : <span className="kdf-drop-placeholder">?</span>}
                      </div>
                    </BigPlayerTile>
                  );
                })}
              </div>
              <div className="card centered-content">
                <button disabled={poolOwnerIds.length > 0} onClick={confirmAssignment}>
                  Zuordnung bestätigen
                </button>
              </div>
            </>
          )}
          {drag && (
            <div
              className="kdf-term-chip kdf-drag-ghost"
              style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width }}
            >
              {textFor(drag.ownerId)}
            </div>
          )}
        </>
      )}

      {game.stage === "results" && game.myResult && (
        <>
          <div className="slf-category">{game.category}</div>
          <div className="big-tile-grid kdf-results-grid">
            {game.myResult.entries.map((entry) => {
              const target = findPlayer(room, entry.targetPlayerId);
              const text = game.revealedWords.find((w) => w.playerId === entry.termOwnerId)?.text ?? "";
              return (
                <BigPlayerTile
                  key={entry.targetPlayerId}
                  player={target}
                  value={text}
                  highlight={entry.correct}
                  gold={game.myResult!.allCorrect}
                  badge={entry.correct ? "+10" : undefined}
                  badgeVariant="positive"
                />
              );
            })}
          </div>
          {showBonusPopup && <div className="kdf-bonus-popup">+5 Bonus — alles richtig!</div>}
          <div className="card centered-content">
            {isHost ? (
              <button onClick={next}>{isLastRound ? "Endauswertung anzeigen" : "Nächste Runde"}</button>
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
