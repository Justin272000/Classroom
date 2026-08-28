import { useEffect, useState } from "react";
import { CHARACTERS } from "../characters";
import { socket } from "../socket";
import type { Player } from "../types";

interface Props {
  players: Player[];
  myId: string | undefined;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export default function CharacterCarousel({ players, myId }: Props) {
  const me = players.find((p) => p.id === myId);
  const myIndex = me?.character ? CHARACTERS.findIndex((c) => c.id === me.character) : -1;
  const [index, setIndex] = useState(myIndex >= 0 ? myIndex : 0);

  const n = CHARACTERS.length;
  const current = CHARACTERS[mod(index, n)];
  const prev = CHARACTERS[mod(index - 1, n)];
  const next = CHARACTERS[mod(index + 1, n)];

  const takenBy = new Map(
    players.filter((p) => p.id !== myId && p.character).map((p) => [p.character as string, p.name])
  );
  const takenByName = takenBy.get(current.id);
  const isMine = me?.character === current.id;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setIndex((i) => i - 1);
      if (e.key === "ArrowRight") setIndex((i) => i + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function select() {
    if (takenByName) return;
    socket.emit("player:setCharacter", { character: current.id }, () => {});
  }

  return (
    <div className="carousel">
      <div className="carousel-track">
        <button type="button" className="carousel-arrow" onClick={() => setIndex((i) => i - 1)} aria-label="Zurück">
          ‹
        </button>

        <img className="carousel-side" src={prev.image} alt="" onClick={() => setIndex((i) => i - 1)} />

        <div className="carousel-current">
          <img
            className={`carousel-current-img${isMine ? " selected" : ""}`}
            src={current.image}
            alt={current.name}
          />
          {isMine && <p className="carousel-status mine">Deine Wahl ✓</p>}
          {!isMine && takenByName && <p className="carousel-status taken">Vergeben an {takenByName}</p>}
        </div>

        <img className="carousel-side" src={next.image} alt="" onClick={() => setIndex((i) => i + 1)} />

        <button type="button" className="carousel-arrow" onClick={() => setIndex((i) => i + 1)} aria-label="Weiter">
          ›
        </button>
      </div>

      <div className="carousel-dots">
        {CHARACTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`dot${mod(index, n) === i ? " active" : ""}${takenBy.has(c.id) ? " taken" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={c.name}
          />
        ))}
      </div>

      <button type="button" className="carousel-select-btn" disabled={!!takenByName} onClick={select}>
        {isMine ? "Ausgewählt" : takenByName ? "Schon vergeben" : "Auswählen"}
      </button>
    </div>
  );
}
