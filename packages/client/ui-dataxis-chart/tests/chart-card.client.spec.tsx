// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { ChartCard } from '../src/client/ChartCard.tsx'

function settledBlock(argsRaw: string): ToolCallBlock {
  return { kind: 'tool-result', callId: 'c1', call: { name: 'render_chart', argsRaw } } as unknown as ToolCallBlock
}

function props(block: ToolCallBlock): ToolCallOwnerProps {
  return {
    callId: 'c1',
    toolName: 'render_chart',
    block,
    openFile: () => {},
    loadImage: (() => Promise.resolve(undefined)) as never,
  } as unknown as ToolCallOwnerProps
}

describe('ChartCard stacked bars', () => {
  it('stacks segments on top of each other, not side by side', () => {
    const view = render(<ChartCard {...props(settledBlock(JSON.stringify({
      title: 'Stacked',
      chart_type: 'bar',
      labels: ['A', 'B'],
      series: [
        { name: 's1', values: [10, 20] },
        { name: 's2', values: [30, 40] },
      ],
      stacked: true,
    })))} />)
    const rects = [...view.container.querySelectorAll('rect')]
    // The first two rects are category A's two stacked segments.
    const [bottom, top] = [rects[0]!, rects[1]!]
    // Stacked: identical x and full-band width (never the grouped bs*si slots).
    expect(bottom.getAttribute('x')).toBe(top.getAttribute('x'))
    expect(bottom.getAttribute('width')).toBe(top.getAttribute('width'))
    // And they sit at different heights (the cumulative offset), not the same y.
    expect(bottom.getAttribute('y')).not.toBe(top.getAttribute('y'))
  })

  it('assigns distinct colors beyond 8 series', () => {
    const series = Array.from({ length: 9 }, (_, i) => ({ name: `s${i}`, values: [i + 1] }))
    const view = render(<ChartCard {...props(settledBlock(JSON.stringify({
      title: 'Colors',
      chart_type: 'bar',
      labels: ['A'],
      series,
    })))} />)
    const fills = [...view.container.querySelectorAll('rect')].map(r => r.getAttribute('fill'))
    expect(new Set(fills).size).toBe(series.length)
  })
})
