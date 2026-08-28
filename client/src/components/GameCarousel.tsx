import { useEffect, useState } from "react";
import { GAMES } from "../games";
import type { GameId } from "../types";

interface Props {
  isHost: boolean;
  onStart: (gameId: GameId) => void;
  error: string | null;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export default function GameCarousel({ isHost, onStart, error }: Props) {
  const [index, setIndex] = useState(0);

  const n = GAMES.length;
  const current = GAMES[mod(index, n)];
  const prev = GAMES[mod(index - 1, n)];
  const next = GAMES[mod(index + 1, n)];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setIndex((i) => i - 1);
      if (e.key === "ArrowRight") setIndex((i) => i + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="carousel">
      <div className="carousel-track">
        <button type="button" className="carousel-arrow" onClick={() => setIndex((i) => i - 1)} aria-label="Zurück">
          ‹
        </button>

        <img className="carousel-side game-cover" src={prev.cover} alt="" onClick={() => setIndex((i) => i - 1)} />

        <div className="carousel-current">
          <img className="carousel-current-img game-cover" src={current.cover} alt={current.name} />
          <p className="hint carousel-tagline">{current.tagline}</p>
        </div>

        <img className="carousel-side game-cover" src={next.cover} alt="" onClick={() => setIndex((i) => i + 1)} />

        <button type="button" className="carousel-arrow" onClick={() => setIndex((i) => i + 1)} aria-label="Weiter">
          ›
        </button>
      </div>

      <div className="carousel-dots">
        {GAMES.map((g, i) => (
          <button
            key={g.id}
            type="button"
            className={`dot${mod(index, n) === i ? " active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={g.name}
          />
        ))}
      </div>

      <button type="button" className="carousel-select-btn" disabled={!isHost} onClick={() => onStart(current.id)}>
        {current.name} starten
      </button>
      {!isHost && <p className="hint">Nur der Host kann ein Spiel starten.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
