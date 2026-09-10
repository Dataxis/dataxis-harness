// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { HtmlCard } from '../src/client/HtmlCard.tsx'

/** Settled tool-result block carrying the given render_html args. */
function settledBlock(argsRaw: string): ToolCallBlock {
  return {
    kind: 'tool-result',
    callId: 'html-1',
    call: { name: 'render_html', argsRaw },
  } as unknown as ToolCallBlock
}

function props(block: ToolCallBlock): ToolCallOwnerProps {
  return {
    callId: 'html-1',
    toolName: 'render_html',
    block,
    openFile: () => {},
    loadImage: (() => Promise.resolve(undefined)) as never,
  } as unknown as ToolCallOwnerProps
}

describe('HtmlCard', () => {
  it('renders the html argument in a sandboxed iframe with the title', () => {
    const view = render(<HtmlCard {...props(settledBlock(JSON.stringify({
      title: 'Summary',
      html: '<table><tr><td>1</td></tr></table>',
    })))} />)
    const frame = view.container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame!.getAttribute('srcDoc')).toContain('<table>')
    expect(frame!.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame!.getAttribute('title')).toBe('Summary')
    expect(view.getByText('Summary')).toBeTruthy()
  })

  it('shows a preparing state while the args are still streaming', () => {
    const running = {
      callId: 'html-2',
      name: 'render_html',
      argsRaw: '',
    } as unknown as ToolCallBlock
    const view = render(<HtmlCard {...props(running)} />)
    expect(view.getByText('Preparing HTML…')).toBeTruthy()
    expect(view.container.querySelector('iframe')).toBeNull()
  })
})
