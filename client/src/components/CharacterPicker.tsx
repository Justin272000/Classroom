import { CHARACTERS } from "../characters";
import { socket } from "../socket";
import type { Player } from "../types";

interface Props {
  players: Player[];
  myId: string | undefined;
}

export default function CharacterPicker({ players, myId }: Props) {
  const me = players.find((p) => p.id === myId);
  const takenBy = new Map(
    players.filter((p) => p.id !== myId && p.character).map((p) => [p.character as string, p.name])
  );

  function pick(characterId: string) {
    if (takenBy.has(characterId)) return;
    socket.emit("player:setCharacter", { character: characterId }, () => {});
  }

  return (
    <div className="character-grid">
      {CHARACTERS.map((c) => {
        const takenName = takenBy.get(c.id);
        const isMine = me?.character === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`character-tile${isMine ? " selected" : ""}`}
            disabled={!!takenName}
            title={takenName ? `Vergeben an ${takenName}` : c.name}
            onClick={() => pick(c.id)}
          >
            <img src={c.image} alt={c.name} />
            <span>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
