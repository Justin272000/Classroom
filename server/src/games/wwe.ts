const QUESTIONS = [
  "Wer würde eher auf dem Mond landen, ohne es jemandem zu sagen?",
  "Wer würde eher versehentlich eine Hochzeit crashen?",
  "Wer würde eher Millionär und würde es niemandem erzählen?",
  "Wer würde eher mitten in der Nacht anrufen, um über Verschwörungstheorien zu reden?",
  "Wer würde eher ein Haustier heimlich mit nach Hause bringen?",
  "Wer würde eher bei einem Fluchtversuch aus dem Gefängnis als Erstes erwischt werden?",
  "Wer würde eher ihren Job kündigen, um Straßenmusiker zu werden?",
  "Wer würde eher in eine Fernsehshow eingeladen werden?",
  "Wer würde eher versehentlich ein Flugzeug verpassen, weil er/sie sich verlaufen hat?",
  "Wer würde eher ein ganzes Wochenende ohne Handy überleben?",
  "Wer würde eher auf einer einsamen Insel als Anführer enden?",
  "Wer würde eher aus Versehen zu einer falschen Beerdigung gehen?",
  "Wer würde eher spontan in ein anderes Land ziehen?",
  "Wer würde eher bei einem Quizshow-Auftritt alles falsch beantworten, aber trotzdem gewinnen?",
  "Wer würde eher ein Geheimnis am längsten für sich behalten?",
  "Wer würde eher versuchen, mit einem Wildtier Freundschaft zu schließen?",
  "Wer würde eher auf einer Party als Erstes tanzen?",
  "Wer würde eher berühmt werden, ohne es zu wollen?",
  "Wer würde eher bei einem Escape Room den Rätseln am längsten hinterherhinken?",
  "Wer würde eher versehentlich den falschen Chat für eine peinliche Nachricht nutzen?",
];

export function pickQuestion(exclude: Set<string> = new Set()): string {
  const pool = QUESTIONS.filter((q) => !exclude.has(q));
  const list = pool.length > 0 ? pool : QUESTIONS;
  return list[Math.floor(Math.random() * list.length)];
}
