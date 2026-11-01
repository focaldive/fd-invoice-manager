// FocalDive emblem (light / Acid Green variant) — source: light_emblem.svg.
// Also used for public/logo.svg, src/app/icon.svg (favicon) and the PDF logo
// (scripts/gen-logo-base64.js). Keep them in sync if the mark changes.

const EMBLEM_VIEWBOX = "0 0 888 1026";
const EMBLEM_FILL = "#9BF019";
const EMBLEM_PATHS = [
  "M853.82 236.49L717.4 157.73V395L648.31 434.91L425 563.81L239.15 671.1V907.86L273.38 927.68L443.65 1026H443.73L887.46 769.79V255.89L853.82 236.49ZM717.4 671.32L648.31 711.23L425 840.16V760.44L648.31 631.51L717.4 591.6V671.32Z",
  "M614.51 98.32L425 207.74L239.15 315.04L170.06 354.9L0 453.11V256.47L170.06 158.26L239.15 118.41L425 11.11L444.23 0L614.51 98.32Z",
  "M648.31 158.53V355.16L425 484.09L239.15 591.39L170.06 631.25L0 729.46V532.82L170.06 434.61L239.15 394.75L425 287.46L648.31 158.53Z",
  "M170.06 710.96V868L34.0698 789.51L170.06 710.96Z",
];

/** Square box of `size` px; the (slightly taller than wide) emblem is centred inside. */
export function FocalDiveLogo({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={EMBLEM_VIEWBOX}
      width={size}
      height={size}
      className={className}
      fill="none"
      role="img"
      aria-label="FocalDive"
    >
      {EMBLEM_PATHS.map((d) => (
        <path key={d} d={d} fill={EMBLEM_FILL} />
      ))}
    </svg>
  );
}

/** Standalone SVG markup of the emblem (e.g. for emails / server-rendered HTML). */
export const FOCALDIVE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EMBLEM_VIEWBOX}" width="104" height="120" fill="none">${EMBLEM_PATHS.map(
  (d) => `<path d="${d}" fill="${EMBLEM_FILL}"/>`,
).join("")}</svg>`;
