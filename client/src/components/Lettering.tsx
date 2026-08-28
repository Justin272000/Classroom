interface Props {
  src: string;
  alt: string;
}

export default function Lettering({ src, alt }: Props) {
  return <img className="lettering" src={src} alt={alt} />;
}
