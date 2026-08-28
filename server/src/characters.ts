export const CHARACTER_IDS = [
  "king",
  "rebel",
  "chicken",
  "sunshine",
  "chill-girl",
  "dj",
  "cat-girl",
  "rocker-girl",
  "buddy",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export function isCharacter(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}
