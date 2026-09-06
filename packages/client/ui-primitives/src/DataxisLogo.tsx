// Dataxis product wordmark: the "DATAXIS" letterforms with a brand-orange
// "AGENT" word beside them. "DATAXIS" rides `currentColor` (so it adapts to
// the active palette — near-white on the Dataxis navy, deep navy on light)
// while "AGENT" carries the Dataxis orange. Use this where the name is the
// logo — the blank-session identity block and the sidebar brand — and keep
// `FishLogo` for the compact square monogram in tight chrome (rail, favicon).

import type { IconProps } from './icons/props.ts'

/**
 * Render the Dataxis wordmark.
 * @param props.size - height in px (default 24; width keeps the 138:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function DataxisLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 138) / 24}
      height={size}
      className={className}
      viewBox="0 0 138 24"
      fill="none"
      aria-hidden="true"
    >
      <text
        x="6"
        y="17.2"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.5"
      >
        DATAXIS
      </text>
      <text
        x="80"
        y="17.2"
        fill="#F0760B"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.5"
      >
        AGENT
      </text>
    </svg>
  )
}
