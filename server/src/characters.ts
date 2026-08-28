export const CHARACTER_IDS = [
  "princess",
  "prince",
  "athlete-f",
  "athlete-m",
  "doctor-f",
  "doctor-m",
  "vet-f",
  "vet-m",
  "singer-f",
  "singer-m",
  "chef-f",
  "chef-m",
  "pilot-f",
  "pilot-m",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export function isCharacter(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}
