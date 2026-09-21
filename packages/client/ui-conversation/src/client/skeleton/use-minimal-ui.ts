/**
 * Whether the shell currently renders its minimal (chat-only) chrome.
 *
 * The frame is the single writer: AppFrame stamps `data-mobile` on the document
 * root from its own box plus the user's manual toggle, and the skeleton CSS
 * reads that same attribute. Before the first stamp exists (the frame's mount
 * commit) the window box is the fallback, so the tab strip never flashes on a
 * phone. The attribute outranks the window box because the frame is the box the
 * layout actually follows, and because a manual toggle must reach this
 * component too: a landscape window can run the minimal UI.
 */

import { useSyncExternalStore } from 'react'

/** The attribute AppFrame stamps on the document root. */
const ATTRIBUTE = 'data-mobile'

function read(): boolean {
  // Non-browser runs (node boots of the client tree) implement no document.
  if (typeof document !== 'undefined') {
    const stamped = document.documentElement.getAttribute(ATTRIBUTE)
    if (stamped !== null) return stamped === 'true'
  }
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTRIBUTE] })
  return () => { observer.disconnect() }
}

/**
 * Read the shell's minimal-UI state, re-rendering when the frame changes it.
 * @returns true while the shell renders the chat-only chrome.
 */
export function useMinimalUi(): boolean {
  return useSyncExternalStore(subscribe, read)
}
