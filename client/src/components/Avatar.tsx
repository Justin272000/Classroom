import { findCharacter } from "../characters";

interface Props {
  characterId: string | null | undefined;
}

export default function Avatar({ characterId }: Props) {
  const character = findCharacter(characterId);
  if (!character) {
    return <span className="player-avatar placeholder">❔</span>;
  }
  return (
    <img className="player-avatar-img" src={character.image} alt={character.name} title={character.name} />
  );
}
