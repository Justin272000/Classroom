export const CHARACTERS = [
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐸",
  "🐙",
  "🦄",
  "🐢",
  "🦉",
  "🐬",
  "🦋",
  "🐺",
  "🐰",
  "🦝",
] as const;

export type Character = (typeof CHARACTERS)[number];

export function isCharacter(value: string): value is Character {
  return (CHARACTERS as readonly string[]).includes(value);
}
