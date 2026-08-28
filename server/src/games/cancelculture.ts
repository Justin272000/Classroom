const STATEMENTS = [
  "Hunde sind besser als Katzen.",
  "Ananas gehört auf Pizza.",
  "Kaffee schmeckt besser als Tee.",
  "Serien sind besser als Filme.",
  "Man sollte Ketchup und Mayo zu Pommes mischen.",
  "Sommer ist die beste Jahreszeit.",
  "Man sollte nie am Handy sein, wenn man mit Freunden isst.",
  "Montage sind gar nicht so schlimm.",
  "Das Toilettenpapier sollte immer 'über' hängen, nicht 'unter'.",
  "Horrorfilme sind überbewertet.",
  "Socken mit Sandalen sind ein No-Go.",
  "Frühaufsteher sind produktiver als Nachteulen.",
  "Man sollte im Restaurant immer Trinkgeld geben, auch bei schlechtem Service.",
  "Cornflakes mit warmer Milch schmecken besser.",
  "Man sollte sich Handynummern merken können, statt sie zu speichern.",
  "Es ist ok, den letzten Bissen vom Teller des Partners zu essen, ohne zu fragen.",
];

export function pickStatement(exclude: Set<string> = new Set()): string {
  const pool = STATEMENTS.filter((s) => !exclude.has(s));
  const list = pool.length > 0 ? pool : STATEMENTS;
  return list[Math.floor(Math.random() * list.length)];
}
