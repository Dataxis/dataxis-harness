// Dataxis brand wordmark: the monogram badge plus the "Dataxis" letterforms in
// one svg. Ink rides currentColor; the badge letter is knocked out in the
// inverted label color so it stays legible in both themes.

import type { IconProps } from './icons/props.ts'

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width keeps the 100:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 100) / 24}
      height={size}
      className={className}
      viewBox="0 0 100 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="var(--dsw-alias-label-primary-inverted)"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        D
      </text>
      <text
        x="27"
        y="16"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="14"
        fontWeight="600"
      >
        Dataxis
      </text>
    </svg>
  )
}
