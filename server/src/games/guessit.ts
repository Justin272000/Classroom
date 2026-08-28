interface GuessItQuestion {
  question: string;
  answer: number;
  unit: string;
}

const QUESTIONS: GuessItQuestion[] = [
  { question: "Wie viele Haare hat ein durchschnittlicher Mensch auf dem Kopf?", answer: 100000, unit: "Haare" },
  { question: "Wie viele Knochen hat ein erwachsener Mensch?", answer: 206, unit: "Knochen" },
  { question: "Wie lang ist die Chinesische Mauer?", answer: 21196, unit: "km" },
  { question: "Wie viele Zähne hat ein erwachsener Hai im Laufe seines Lebens?", answer: 30000, unit: "Zähne" },
  { question: "Wie viele Menschen leben aktuell auf der Erde?", answer: 8200000000, unit: "Menschen" },
  { question: "Wie hoch ist der Mount Everest?", answer: 8849, unit: "m" },
  { question: "Wie viele Herzen hat ein Krake?", answer: 3, unit: "Herzen" },
  { question: "Wie alt kann eine Galapagos-Riesenschildkröte werden?", answer: 180, unit: "Jahre" },
  { question: "Wie viele Sprachen gibt es weltweit ungefähr?", answer: 7000, unit: "Sprachen" },
  { question: "Wie schnell kann ein Gepard maximal laufen?", answer: 110, unit: "km/h" },
  { question: "Wie viele Liter Blut pumpt ein menschliches Herz pro Tag?", answer: 7500, unit: "Liter" },
  { question: "Wie viele Stufen hat der Eiffelturm?", answer: 1665, unit: "Stufen" },
  { question: "Wie viele Muskeln braucht ein Mensch zum Lächeln?", answer: 12, unit: "Muskeln" },
  { question: "Wie tief ist der tiefste Punkt der Ozeane (Marianengraben)?", answer: 10935, unit: "m" },
  { question: "Wie viele Eier legt ein Huhn im Durchschnitt pro Jahr?", answer: 300, unit: "Eier" },
  { question: "Wie viele Buchstaben hat das längste offizielle deutsche Wort im Duden?", answer: 36, unit: "Buchstaben" },
];

export function pickQuestion(exclude: Set<string> = new Set()): GuessItQuestion {
  const pool = QUESTIONS.filter((q) => !exclude.has(q.question));
  const list = pool.length > 0 ? pool : QUESTIONS;
  return list[Math.floor(Math.random() * list.length)];
}
