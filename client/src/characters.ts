export interface CharacterDef {
  id: string;
  name: string;
  image: string;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "king", name: "König", image: "/characters/king.webp" },
  { id: "rebel", name: "Rebell", image: "/characters/rebel.webp" },
  { id: "chicken", name: "Hühnchen", image: "/characters/chicken.webp" },
  { id: "sunshine", name: "Sonnenschein", image: "/characters/sunshine.webp" },
  { id: "chill-girl", name: "Chillerin", image: "/characters/chill-girl.webp" },
  { id: "dj", name: "DJ", image: "/characters/dj.webp" },
  { id: "cat-girl", name: "Katzenmädchen", image: "/characters/cat-girl.webp" },
  { id: "rocker-girl", name: "Rockerin", image: "/characters/rocker-girl.webp" },
  { id: "buddy", name: "Kumpel", image: "/characters/buddy.webp" },
];

export function findCharacter(id: string | null | undefined): CharacterDef | undefined {
  return id ? CHARACTERS.find((c) => c.id === id) : undefined;
}
