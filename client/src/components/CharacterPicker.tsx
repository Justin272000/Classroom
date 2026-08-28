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

  function pick(character: string) {
    if (takenBy.has(character)) return;
    socket.emit("player:setCharacter", { character }, () => {});
  }

  return (
    <div className="character-grid">
      {CHARACTERS.map((c) => {
        const takenName = takenBy.get(c);
        const isMine = me?.character === c;
        return (
          <button
            key={c}
            type="button"
            className={`character-tile${isMine ? " selected" : ""}`}
            disabled={!!takenName}
            title={takenName ? `Vergeben an ${takenName}` : undefined}
            onClick={() => pick(c)}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
