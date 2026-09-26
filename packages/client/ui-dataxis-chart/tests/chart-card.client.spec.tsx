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

describe('ChartCard axis captions and margins', () => {
  const argsOf = (extra: Record<string, unknown>): string => JSON.stringify({
    title: 'T',
    chart_type: 'bar',
    labels: ['A'],
    series: [{ name: 'Views', values: [3] }],
    ...extra,
  })

  /** The y-axis spine: the only line drawn with the l2 border token. */
  const leftMargin = (view: { container: HTMLElement }): number => {
    const spine = [...view.container.querySelectorAll('line')]
      .find(line => line.getAttribute('stroke') === 'var(--dsw-alias-border-l2)')
    return Number(spine?.getAttribute('x1'))
  }

  it('renders the axis captions the tool requires', () => {
    const view = render(<ChartCard {...props(settledBlock(argsOf({
      x_label: 'Country',
      y_label: 'Views (in millions)',
    })))} />)
    const text = view.container.textContent ?? ''
    expect(text).toContain('Country')
    expect(text).toContain('Views (in millions)')
  })

  it('grows the left margin for wide ticks instead of drawing past the edge', () => {
    const small = render(<ChartCard {...props(settledBlock(argsOf({})))} />)
    const large = render(<ChartCard {...props(settledBlock(argsOf({
      series: [{ name: 'Views', values: [1_200_000] }],
    })))} />)
    expect(leftMargin(large)).toBeGreaterThan(leftMargin(small))
    expect(leftMargin(large)).toBeGreaterThan(56)
    // No text is positioned left of the viewBox origin, which is where the ticks
    // escaped when the margin was the fixed 56px.
    for (const node of large.container.querySelectorAll('text')) {
      const x = Number(node.getAttribute('x'))
      if (!Number.isNaN(x)) expect(x).toBeGreaterThanOrEqual(0)
    }
  })

  it('reserves the extra line the x caption occupies', () => {
    const without = render(<ChartCard {...props(settledBlock(argsOf({})))} />)
    const withCaption = render(<ChartCard {...props(settledBlock(argsOf({ x_label: 'Country' })))} />)
    const axisY = (view: { container: HTMLElement }): number => Number(
      [...view.container.querySelectorAll('line')]
        .find(line => line.getAttribute('stroke') === 'var(--dsw-alias-border-l2)')?.getAttribute('y2'),
    )
    expect(axisY(withCaption)).toBeLessThan(axisY(without))
  })
})

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

describe('ChartCard responsive layout', () => {
  it('lays out at the measured container width so axis text keeps its size', () => {
    // jsdom has no ResizeObserver, so the hook would take its fallback and this test
    // would assert nothing. Report a narrow-panel width through a stub instead.
    const observed: Element[] = []
    class StubObserver {
      constructor(private readonly notify: (entries: { contentRect: { width: number } }[]) => void) {}
      observe(element: Element): void {
        observed.push(element)
        this.notify([{ contentRect: { width: 340 } }])
      }
      disconnect(): void {}
    }
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = StubObserver as unknown as typeof ResizeObserver
    try {
      const view = render(<ChartCard {...props(settledBlock(JSON.stringify({
        title: 'Narrow',
        chart_type: 'bar',
        labels: ['A', 'B'],
        series: [{ name: 's1', values: [1, 2] }],
      })))} />)

      expect(observed).toHaveLength(1)
      const svg = view.container.querySelector('svg')
      // The viewBox width equals the measured width and the height stays 320, so one
      // user unit is one CSS pixel: an 11px tick renders at 11px in the sidebar panel
      // instead of scaling down with it, and the plot area absorbs the difference.
      expect(svg?.getAttribute('viewBox')).toBe('0 0 340 320')
      // The labels themselves were never the problem — their rendered size was.
      const tick = [...view.container.querySelectorAll('text')].find(t => t.textContent === 'A')
      expect(tick?.getAttribute('font-size')).toBe('11')
    } finally {
      globalThis.ResizeObserver = original
    }
  })
})
