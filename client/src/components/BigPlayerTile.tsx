import { findCharacter } from "../characters";
import type { Player } from "../types";

interface Props {
  player: Player;
  /** shown below the name, e.g. a submitted answer */
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** green ring, e.g. "closest guess" or "scored this round" */
  highlight?: boolean;
  /** small corner label, e.g. "Host" or "+10" */
  badge?: string;
  badgeVariant?: "positive";
  /** visually dim, e.g. disconnected */
  dimmed?: boolean;
}

export default function BigPlayerTile({
  player,
  value,
  onClick,
  disabled,
  highlight,
  badge,
  badgeVariant,
  dimmed,
}: Props) {
  const character = findCharacter(player.character);
  const className = `big-tile${highlight ? " highlighted" : ""}${dimmed ? " dimmed" : ""}`;

  const content = (
    <>
      {badge && (
        <span className={`big-tile-badge${badgeVariant ? ` ${badgeVariant}` : ""}`}>{badge}</span>
      )}
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
