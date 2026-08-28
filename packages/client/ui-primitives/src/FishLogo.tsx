// Dataxis brand mark: a rounded-square monogram badge with a knocked-out "D".
// Ink rides currentColor; the letter is knocked out in the inverted label
// color so the badge stays legible in both themes.

import type { IconProps } from './icons/props.ts'

/**
 * Render the Dataxis brand mark (compact monogram).
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the mark svg (aria-hidden decorative brand art).
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="currentColor" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="var(--dsw-alias-label-primary-inverted)"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        D
      </text>
    </svg>
  )
}
