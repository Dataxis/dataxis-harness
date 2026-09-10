/**
 * Inline HTML card for the `render_html` tool. Renders the tool call's
 * `html` argument in a sandboxed iframe (unique opaque origin, scripts allowed,
 * no parent access) so the artifact appears directly in the conversation feed
 * without executing against the app origin. Pure presentation: it reads only
 * the frozen call's `argsRaw`.
 * @module @deepseek-ai/dsh-client-ui-dataxis-chart/client
 */

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './HtmlCard.module.css'

interface HtmlArgs {
  title?: string
  html?: string
}

/** Parse the tool call's JSON arguments, or null while they are still streaming. */
function parseHtmlArgs(block: ToolCallBlock | undefined): HtmlArgs | null {
  if (block === undefined) return null
  const settled = 'kind' in block
  const raw = settled ? block.call?.argsRaw : block.argsRaw
  if (typeof raw !== 'string' || raw === '') return null
  try {
    return JSON.parse(raw) as HtmlArgs
  } catch {
    return null
  }
}

/** The inline HTML card registered under the `render_html` toolview key. */
export function HtmlCard({ block }: ToolCallOwnerProps): ReactNode {
  const args = useMemo(() => parseHtmlArgs(block), [block])

  if (args === null) {
    return <div className={css.card}><div className={css.empty}>Preparing HTML…</div></div>
  }

  const title = args.title ?? 'HTML'
  return (
    <div className={css.card}>
      <div className={css.head}>
        <div className={css.title}>{title}</div>
      </div>
      <iframe
        className={css.frame}
        title={title}
        srcDoc={args.html ?? ''}
        sandbox="allow-scripts"
      />
    </div>
  )
}
