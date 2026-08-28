import type { GameId } from "./types";

export interface GameDef {
  id: GameId;
  name: string;
  tagline: string;
  cover: string;
}

export const GAMES: GameDef[] = [
  {
    id: "wwe",
    name: "Wer würde eher",
    tagline: "Abstimmen, wer am ehesten passt",
    cover: "/covers/wer-wuerde-eher.webp",
  },
  {
    id: "whoami",
    name: "Wer bin ich",
    tagline: "Identität erraten per Ja/Nein-Fragen",
    cover: "/covers/wer-bin-ich.webp",
  },
  {
    id: "guessit",
    name: "Schätzfragen",
    tagline: "Schätzen, alle Antworten im Vergleich",
    cover: "/covers/schaetzfragen.webp",
  },
  {
    id: "cancelculture",
    name: "Cancel Culture",
    tagline: "Ja oder Nein zu steilen Thesen, anonym",
    cover: "/covers/cancel-culture.webp",
  },
  {
    id: "stadtlandfluss",
    name: "Zwei Dumme, ein Gedanke",
    tagline: "10 Runden, Punkte für Übereinstimmungen",
    cover: "/covers/zwei-dumme-ein-gedanke.webp",
  },
];
