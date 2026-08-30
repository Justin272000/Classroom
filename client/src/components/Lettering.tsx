interface Props {
  src: string;
  alt: string;
  /** host-only: lets the title double as a "leave the game" control */
  onClick?: () => void;
}

export default function Lettering({ src, alt, onClick }: Props) {
  const img = <img className="lettering" src={src} alt={alt} />;
  if (!onClick) return img;
  return (
    <button
      type="button"
      className="lettering-button"
      onClick={onClick}
      title="Spiel beenden und zur Lobby zurückkehren"
    >
      {img}
    </button>
  );
}
