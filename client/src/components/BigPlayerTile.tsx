import { findCharacter } from "../characters";
import type { Player } from "../types";

interface Props {
  player: Player;
  /** shown below the name, e.g. a submitted answer */
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

export default function BigPlayerTile({ player, value, onClick, disabled, highlight }: Props) {
  const character = findCharacter(player.character);
  const className = `big-tile${highlight ? " closest" : ""}`;

  const content = (
    <>
      {character ? (
        <img className="big-tile-avatar" src={character.image} alt={character.name} />
      ) : (
        <div className="big-tile-avatar big-tile-avatar-placeholder">❔</div>
      )}
      <span className="big-tile-name">{player.name}</span>
      {value !== undefined && <span className="big-tile-value">{value}</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
