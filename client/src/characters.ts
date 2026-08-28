export interface CharacterDef {
  id: string;
  name: string;
  image: string;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "princess", name: "Prinzessin", image: "/characters/princess.webp" },
  { id: "prince", name: "Prinz", image: "/characters/prince.webp" },
  { id: "athlete-f", name: "Sportlerin", image: "/characters/athlete-f.webp" },
  { id: "athlete-m", name: "Sportler", image: "/characters/athlete-m.webp" },
  { id: "doctor-f", name: "Ärztin", image: "/characters/doctor-f.webp" },
  { id: "doctor-m", name: "Arzt", image: "/characters/doctor-m.webp" },
  { id: "vet-f", name: "Tierärztin", image: "/characters/vet-f.webp" },
  { id: "vet-m", name: "Tierarzt", image: "/characters/vet-m.webp" },
  { id: "singer-f", name: "Sängerin", image: "/characters/singer-f.webp" },
  { id: "singer-m", name: "Sänger", image: "/characters/singer-m.webp" },
  { id: "chef-f", name: "Köchin", image: "/characters/chef-f.webp" },
  { id: "chef-m", name: "Koch", image: "/characters/chef-m.webp" },
  { id: "pilot-f", name: "Pilotin", image: "/characters/pilot-f.webp" },
  { id: "pilot-m", name: "Pilot", image: "/characters/pilot-m.webp" },
];

export function findCharacter(id: string | null | undefined): CharacterDef | undefined {
  return id ? CHARACTERS.find((c) => c.id === id) : undefined;
}
