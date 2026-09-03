/**
 * Inline interactive chart card for the `render_chart` tool. Renders a
 * hand-rolled SVG chart (bar / horizontal bar / line / area / pie / donut) from
 * the tool call's arguments, with hover tooltips and a click-to-toggle legend.
 * Pure presentation: it reads only the frozen call's `argsRaw` and owns no
 * runtime state beyond the hover/toggle interaction.
 * @module @deepseek-ai/dsh-client-ui-dataxis-chart/client
 */

import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './ChartCard.module.css'

const PALETTE = ['#5b8def', '#f2a65a', '#54c2a1', '#e0788c', '#a58bef', '#6fc3e8', '#e8c15a', '#c78be0']

interface RawSeries {
  name?: string
  values?: number[]
}

interface ChartArgs {
  title?: string
  chart_type?: string
  labels?: string[]
  series?: RawSeries[]
  stacked?: boolean
  colors?: string[]
}

interface Series {
  name: string
  values: number[]
  color: string
}

interface TipRow {
  name: string
  value: string
  color: string
}

interface Tip {
  title: string
  rows: TipRow[]
}

/** Format a number with thousands separators and up to two decimals. */
function fmt(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return ''
  const r = Number.isInteger(n) ? n : Math.round(n * 100) / 100
  const neg = r < 0
  const parts = String(Math.abs(r)).split('.')
  parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + parts.join('.')
}

/** Round a value up to a "nice" axis maximum. */
function niceMax(v: number): number {
  if (!(v > 0)) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

/** Evenly spaced tick values from 0 to max. */
function ticks(max: number, count: number): number[] {
  const step = max / count
  const out: number[] = []
  for (let i = 0; i <= count; i++) out.push(step * i)
  return out
}

/** Parse the tool call's JSON arguments, or null while they are still streaming. */
function parseArgs(block: ToolCallBlock | undefined): ChartArgs | null {
  if (block === undefined) return null
  const settled = 'kind' in block
  const raw = settled ? block.call?.argsRaw : block.argsRaw
  if (typeof raw !== 'string' || raw === '') return null
  try {
    return JSON.parse(raw) as ChartArgs
  } catch {
    return null
  }
}

function piePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
}

function donutPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const x0 = cx + rOuter * Math.cos(a0)
  const y0 = cy + rOuter * Math.sin(a0)
  const x1 = cx + rOuter * Math.cos(a1)
  const y1 = cy + rOuter * Math.sin(a1)
  const x2 = cx + rInner * Math.cos(a1)
  const y2 = cy + rInner * Math.sin(a1)
  const x3 = cx + rInner * Math.cos(a0)
  const y3 = cy + rInner * Math.sin(a0)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`
}

interface LegendProps {
  items: ReadonlyArray<{ key: string; label: string; color: string }>
  hidden: Record<string, boolean>
  onToggle: (key: string) => void
}

function Legend({ items, hidden, onToggle }: LegendProps): ReactNode {
  return (
    <div className={css.legend}>
      {items.map(it => (
        <div
          key={it.key}
          className={hidden[it.key] ? `${css.legendItem} ${css.off}` : css.legendItem}
          onClick={() => { onToggle(it.key) }}
        >
          <span className={css.swatch} style={{ background: it.color }} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

interface ChartProps {
  chartType: string
  labels: string[]
  series: Series[]
  hidden: Record<string, boolean>
  stacked?: boolean
  colors: string[]
  onShow: (title: string, rows: TipRow[]) => void
  onHide: () => void
}

function CartesianChart({ chartType, labels, series, hidden, stacked = false, onShow, onHide }: ChartProps): ReactNode {
  const W = 720
  const H = 320
  const L = 56
  const R = 20
  const T = 18
  const B = 46
  const plotW = W - L - R
  const plotH = H - T - B
  const n = Math.max(labels.length, 1)
  const visible = series.filter(s => !hidden[s.name])
  const stack = stacked && chartType === 'bar'

  let maxV = 0
  for (const s of visible) {
    for (const v of s.values) if (typeof v === 'number' && v > maxV) maxV = v
  }
  if (stack) {
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (const s of visible) {
        const v = s.values[i]
        if (typeof v === 'number') sum += v
      }
      if (sum > maxV) maxV = sum
    }
  }
  const top = niceMax(maxV)
  const yTicks = ticks(top, 5)

  const xFor = (i: number): number => (n === 1 ? L + plotW / 2 : L + plotW * (i / (n - 1)))
  const yFor = (v: number): number => T + plotH * (1 - v / top)
  const horizontal = chartType === 'hbar'

  const grid: ReactNode[] = []
  const catLabels: ReactNode[] = []
  if (horizontal) {
    for (const t of yTicks) {
      const x = L + plotW * (t / top)
      grid.push(
        <g key={`gx${t}`}>
          <line x1={x} y1={T} x2={x} y2={T + plotH} stroke="var(--dsw-alias-border-l1)" strokeWidth={1} />
          <text x={x} y={T + plotH + 18} textAnchor="middle" fontSize={11} fill="var(--dsw-alias-label-secondary)">{fmt(t)}</text>
        </g>,
      )
    }
    const band = plotH / n
    labels.forEach((lb, i) => {
      catLabels.push(
        <text key={`cy${i}`} x={L - 8} y={T + band * (i + 0.5) + 4} textAnchor="end" fontSize={11} fill="var(--dsw-alias-label-secondary)">{lb}</text>,
      )
    })
  } else {
    for (const t of yTicks) {
      grid.push(
        <g key={`gy${t}`}>
          <line x1={L} y1={yFor(t)} x2={W - R} y2={yFor(t)} stroke="var(--dsw-alias-border-l1)" strokeWidth={1} />
          <text x={L - 8} y={yFor(t) + 4} textAnchor="end" fontSize={11} fill="var(--dsw-alias-label-secondary)">{fmt(t)}</text>
        </g>,
      )
    }
    labels.forEach((lb, i) => {
      catLabels.push(
        <text key={`cx${i}`} x={xFor(i)} y={H - B + 18} textAnchor="middle" fontSize={11} fill="var(--dsw-alias-label-secondary)">{lb}</text>,
      )
    })
  }

  const axes = (
    <g>
      <line x1={L} y1={T} x2={L} y2={T + plotH} stroke="var(--dsw-alias-border-l2)" strokeWidth={1} />
      <line x1={L} y1={T + plotH} x2={W - R} y2={T + plotH} stroke="var(--dsw-alias-border-l2)" strokeWidth={1} />
    </g>
  )

  let marks: ReactNode[] = []
  if (chartType === 'bar' || chartType === 'hbar') {
    const band = horizontal ? plotH / n : plotW / n
    const gap = band * 0.25
    const count = Math.max(visible.length, 1)
    const bs = (band - gap) / count
    marks = labels.map((_, i) => {
      let acc = 0
      const rects: ReactNode[] = []
      visible.forEach((s, si) => {
        const v = s.values[i]
        if (typeof v !== 'number') return
        const topVal = stack ? acc + v : v
        const enter = (): void => { onShow(labels[i]!, [{ name: s.name, value: fmt(v), color: s.color }]) }
        if (horizontal) {
          rects.push(
            <rect
              key={`${s.name}:${i}`}
              x={L}
              y={T + band * i + gap / 2 + bs * si}
              width={Math.max(plotW * (v / top), 0.5)}
              height={bs}
              rx={2}
              fill={s.color}
              onMouseEnter={enter}
              onMouseLeave={onHide}
              style={{ cursor: 'pointer' }}
            />,
          )
        } else {
          rects.push(
            <rect
              key={`${s.name}:${i}`}
              x={L + band * i + gap / 2 + bs * si}
              y={yFor(topVal)}
              width={bs}
              height={Math.max(plotH * (v / top), 0.5)}
              rx={2}
              fill={s.color}
              onMouseEnter={enter}
              onMouseLeave={onHide}
              style={{ cursor: 'pointer' }}
            />,
          )
        }
        if (stack) acc += v
      })
      return <g key={`cat${i}`}>{rects}</g>
    })
  } else {
    visible.forEach((s, si) => {
      const pts: Array<{ x: number; y: number; v: number; i: number }> = []
      for (let i = 0; i < n; i++) {
        const v = s.values[i]
        if (typeof v === 'number') pts.push({ x: xFor(i), y: yFor(v), v, i })
      }
      if (pts.length === 0) return
      const lineD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const first = pts[0]!
      const last = pts[pts.length - 1]!
      if (chartType === 'area') {
        const areaD = `${lineD} L ${last.x} ${T + plotH} L ${first.x} ${T + plotH} Z`
        marks.push(<path key={`area${si}`} d={areaD} fill={s.color} opacity={0.16} stroke="none" />)
      }
      marks.push(<path key={`line${si}`} d={lineD} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)
      for (const p of pts) {
        marks.push(
          <circle
            key={`pt${si}:${p.i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={s.color}
            stroke="var(--dsw-alias-bg-layer-1)"
            strokeWidth={1.5}
            onMouseEnter={() => { onShow(labels[p.i]!, [{ name: s.name, value: fmt(p.v), color: s.color }]) }}
            onMouseLeave={onHide}
            style={{ cursor: 'pointer' }}
          />,
        )
      }
    })
  }

  return (
    <svg className={css.svg} viewBox={`0 0 ${W} ${H}`} role="img">
      {grid}{axes}{marks}{catLabels}
    </svg>
  )
}

function PieChart({ chartType, labels, series, colors, hidden, onShow, onHide }: ChartProps): ReactNode {
  const donut = chartType === 'donut'
  const cx = 180
  const cy = 150
  const r = 108
  const rInner = donut ? 62 : 0
  const values = series[0]?.values ?? []
  let total = 0
  const idx: number[] = []
  for (let i = 0; i < labels.length; i++) {
    if (hidden[labels[i]!]) continue
    const v = values[i]
    if (typeof v === 'number' && v > 0) {
      total += v
      idx.push(i)
    }
  }
  let angle = -Math.PI / 2
  const slices = idx.map((i) => {
    const v = values[i]!
    const frac = total > 0 ? v / total : 0
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const color = colors[i % colors.length]!
    const d = donut ? donutPath(cx, cy, r, rInner, a0, a1) : piePath(cx, cy, r, a0, a1)
    return (
      <path
        key={`slice${i}`}
        d={d}
        fill={color}
        stroke="var(--dsw-alias-bg-layer-1)"
        strokeWidth={1.5}
        onMouseEnter={() => { onShow(labels[i]!, [{ name: labels[i]!, value: `${fmt(v)} (${Math.round(frac * 100)}%)`, color }]) }}
        onMouseLeave={onHide}
        style={{ cursor: 'pointer' }}
      />
    )
  })

  const center = donut
    ? (
      <g>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--dsw-alias-label-primary)">{fmt(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="var(--dsw-alias-label-secondary)">Total</text>
      </g>
    )
    : null

  return (
    <svg className={css.svg} viewBox="0 0 360 300" role="img">
      {slices}{center}
    </svg>
  )
}

/** The inline chart card registered under the `render_chart` toolview key. */
export function ChartCard({ block }: ToolCallOwnerProps): ReactNode {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [tip, setTip] = useState<Tip | null>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const args = useMemo(() => parseArgs(block), [block])

  const onMove = useCallback((e: { currentTarget: HTMLDivElement; clientX: number; clientY: number }): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])
  const show = useCallback((title: string, rows: TipRow[]): void => { setTip({ title, rows }) }, [])
  const hide = useCallback((): void => { setTip(null) }, [])
  const toggle = useCallback((name: string): void => {
    setHidden((h) => {
      const n = { ...h }
      n[name] = !n[name]
      return n
    })
  }, [])

  if (args === null) {
    return <div className={css.card}><div className={css.empty}>Preparing chart…</div></div>
  }

  const labels = args.labels ?? []
  const colors = args.colors !== undefined && args.colors.length > 0 ? args.colors : PALETTE
  const series: Series[] = (args.series ?? []).map((s, i) => ({
    name: s.name !== undefined && s.name !== '' ? s.name : `Series ${i + 1}`,
    values: s.values ?? [],
    color: colors[i % colors.length]!,
  }))
  const chartType = args.chart_type ?? 'bar'
  const isPie = chartType === 'pie' || chartType === 'donut'

  const legendItems = isPie
    ? labels.map((lb, i) => ({ key: lb, label: lb, color: colors[i % colors.length]! }))
    : series.map(s => ({ key: s.name, label: s.name, color: s.color }))

  const sub = isPie ? `${labels.length} slices` : `${labels.length} categories · ${series.length} series`

  const legend = legendItems.length > 1
    ? <Legend items={legendItems} hidden={hidden} onToggle={toggle} />
    : null

  const body = isPie
    ? <PieChart chartType={chartType} labels={labels} series={series} colors={colors} hidden={hidden} onShow={show} onHide={hide} />
    : <CartesianChart chartType={chartType} labels={labels} series={series} hidden={hidden} stacked={args.stacked === true} colors={colors} onShow={show} onHide={hide} />

  let tipEl: ReactNode = null
  if (tip !== null) {
    const flip = mouse.x > 300
    const style: CSSProperties = flip
      ? { left: mouse.x - 10, top: Math.max(4, mouse.y - 10), transform: 'translateX(-100%)' }
      : { left: mouse.x + 12, top: Math.max(4, mouse.y - 10) }
    tipEl = (
      <div className={css.tip} style={style}>
        <div className={css.tipTitle}>{tip.title}</div>
        {tip.rows.map((r, i) => (
          <div className={css.tipRow} key={i}>
            <span className={css.tipDot} style={{ background: r.color }} />
            <span>{r.name}</span>
            <span className={css.tipVal}>{r.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div className={css.title}>{args.title ?? 'Chart'}</div>
        <div className={css.sub}>{sub}</div>
      </div>
      {legend}
      <div className={css.body} onMouseMove={onMove} onMouseLeave={hide}>
        {body}
        {tipEl}
      </div>
    </div>
  )
}
