// Consistent pastel colour per movie, matched to a legend — deterministic
// hash so the same movie always renders the same colour across the board.

const PALETTE = [
  { bg: "#0f766e", text: "#f0fdfa", label: "teal" }, // teal
  { bg: "#f472b6", text: "#500724", label: "pink" },
  { bg: "#facc15", text: "#422006", label: "yellow" },
  { bg: "#7dd3fc", text: "#082f49", label: "sky" },
  { bg: "#a5b4fc", text: "#1e1b4b", label: "indigo" },
  { bg: "#bef264", text: "#1a2e05", label: "lime" },
  { bg: "#fdba74", text: "#431407", label: "orange" },
  { bg: "#c4b5fd", text: "#2e1065", label: "violet" },
  { bg: "#5eead4", text: "#042f2e", label: "teal-light" },
  { bg: "#fda4af", text: "#4c0519", label: "rose" },
];

export function colorForMovie(movieId: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < movieId.length; i++) {
    hash = (hash * 31 + movieId.charCodeAt(i)) >>> 0;
  }
  const swatch = PALETTE[hash % PALETTE.length];
  return { bg: swatch.bg, text: swatch.text };
}
