import type { GameId } from "./types";

export interface GameDef {
  id: GameId;
  name: string;
  cover: string;
  /** optional — a game without dedicated background art yet just falls back
   * to the page's plain default styling (see pageBackgroundStyle). */
  background?: string;
  /** optional — used instead of a plain fallback when there's no background
   * image, e.g. a color sampled from the game's cover art. */
  backgroundColor?: string;
  lettering: string;
}

export const GAMES: GameDef[] = [
  {
    id: "wwe",
    name: "Wer würde eher",
    cover: "/covers/wer-wuerde-eher.webp",
    background: "/backgrounds/wwe.webp",
    lettering: "/lettering/wwe.webp",
  },
  {
    id: "whoami",
    name: "Wer bin ich",
    cover: "/covers/wer-bin-ich.webp",
    background: "/backgrounds/whoami.webp",
    lettering: "/lettering/whoami.webp",
  },
  {
    id: "guessit",
    name: "Schätzfragen",
    cover: "/covers/schaetzfragen.webp",
    background: "/backgrounds/guessit.webp",
    lettering: "/lettering/guessit.webp",
  },
  {
    id: "cancelculture",
    name: "Cancel Culture",
    cover: "/covers/cancel-culture.webp",
    background: "/backgrounds/cancelculture.webp",
    lettering: "/lettering/cancelculture.webp",
  },
  {
    id: "stadtlandfluss",
    name: "Zwei Dumme, ein Gedanke",
    cover: "/covers/zwei-dumme-ein-gedanke.webp",
    background: "/backgrounds/stadtlandfluss.webp",
    lettering: "/lettering/stadtlandfluss.webp",
  },
  {
    id: "zeitbombe",
    name: "Zeitbombe",
    cover: "/covers/zeitbombe.webp",
    background: "/backgrounds/stadtlandfluss.webp",
    lettering: "/lettering/zeitbombe.webp",
  },
  {
    id: "kennedeinefreunde",
    name: "Kenne deine Freunde",
    cover: "/covers/kenne-deine-freunde.webp",
    background: "/backgrounds/whoami.webp",
    lettering: "/lettering/kennedeinefreunde.webp",
  },
];

export function findGame(id: GameId): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
