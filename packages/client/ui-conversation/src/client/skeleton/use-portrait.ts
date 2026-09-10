/**
 * Whether the viewport is taller than it is wide, tracked live.
 *
 * Mobile mode is the only consumer: a portrait screen drops the shell chrome
 * it has no room for. `orientation: portrait` is exactly height > width, and
 * the stylesheets that hide the rest of that chrome read the same media
 * condition, so a component and the CSS around it never disagree.
 */

import { useSyncExternalStore } from 'react'

/** The portrait media condition, shared by read and subscribe. */
const QUERY = '(orientation: portrait)'

function subscribe(onChange: () => void): () => void {
  // jsdom (the unit lane) and non-browser boots implement no matchMedia.
  if (typeof matchMedia !== 'function') return () => {}
  const media = matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => { media.removeEventListener('change', onChange) }
}

function read(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches
}

/**
 * Read the viewport orientation, re-rendering on rotation.
 * @returns true while the viewport is taller than it is wide.
 */
export function usePortrait(): boolean {
  return useSyncExternalStore(subscribe, read)
}
