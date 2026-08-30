import type { CSSProperties } from "react";

// The background art is bright and busy (confetti/sunburst), so every page
// gets a dark scrim baked into the same background-image stack — keeps the
// existing light-on-dark card/text colors readable without touching them.
// `image` is optional so a game without dedicated background art yet just
// falls back to the page's plain default styling instead of breaking.
export function pageBackgroundStyle(image: string | undefined): CSSProperties {
  if (!image) return {};
  return {
    backgroundImage: `linear-gradient(180deg, rgba(10, 10, 20, 0.72), rgba(10, 10, 20, 0.88)), url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
  };
}
