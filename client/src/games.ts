import type { GameId } from "./types";

export interface GameDef {
  id: GameId;
  name: string;
  tagline: string;
  cover: string;
  background: string;
  lettering: string;
}

export const GAMES: GameDef[] = [
  {
    id: "wwe",
    name: "Wer würde eher",
    tagline: "Abstimmen, wer am ehesten passt",
    cover: "/covers/wer-wuerde-eher.webp",
    background: "/backgrounds/wwe.webp",
    lettering: "/lettering/wwe.webp",
  },
  {
    id: "whoami",
    name: "Wer bin ich",
    tagline: "Identität erraten per Ja/Nein-Fragen",
    cover: "/covers/wer-bin-ich.webp",
    background: "/backgrounds/whoami.webp",
    lettering: "/lettering/whoami.webp",
  },
  {
    id: "guessit",
    name: "Schätzfragen",
    tagline: "Schätzen, alle Antworten im Vergleich",
    cover: "/covers/schaetzfragen.webp",
    background: "/backgrounds/guessit.webp",
    lettering: "/lettering/guessit.webp",
  },
  {
    id: "cancelculture",
    name: "Cancel Culture",
    tagline: "Ja oder Nein zu steilen Thesen, anonym",
    cover: "/covers/cancel-culture.webp",
    background: "/backgrounds/cancelculture.webp",
    lettering: "/lettering/cancelculture.webp",
  },
  {
    id: "stadtlandfluss",
    name: "Zwei Dumme, ein Gedanke",
    tagline: "10 Runden, Punkte für Übereinstimmungen",
    cover: "/covers/zwei-dumme-ein-gedanke.webp",
    background: "/backgrounds/stadtlandfluss.webp",
    lettering: "/lettering/stadtlandfluss.webp",
  },
  {
    id: "zeitbombe",
    name: "Zeitbombe",
    tagline: "Reihum Begriffe finden, bevor die Bombe hochgeht",
    cover: "/covers/zeitbombe.webp",
    background: "/backgrounds/zeitbombe.webp",
    lettering: "/lettering/zeitbombe.webp",
  },
];

export function findGame(id: GameId): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
