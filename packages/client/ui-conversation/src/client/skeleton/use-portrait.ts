/**
 * Whether the viewport is taller than it is wide, tracked live.
 *
 * Mobile mode is the only consumer: a portrait screen drops the shell chrome
 * it has no room for. Reads the window's own box (`height > width`) rather than
 * the `orientation` media query — inside a cross-origin iframe `orientation`
 * can reflect the top-level window instead of the embedded frame's box.
 */

import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {}
  window.addEventListener('resize', onChange)
  return () => { window.removeEventListener('resize', onChange) }
}

function read(): boolean {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth
}

/**
 * Read whether the viewport is portrait (taller than it is wide), re-rendering
 * on resize.
 * @returns true while the viewport is taller than it is wide.
 */
export function usePortrait(): boolean {
  return useSyncExternalStore(subscribe, read)
}
