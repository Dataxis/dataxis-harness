/**
 * Browser half of the Dataxis chart card plugin: registers the inline chart
 * card for the `render_chart` tool under the keyed `tool.call.toolview` slot.
 * @module @deepseek-ai/dsh-client-ui-dataxis-chart/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { ChartCard } from './ChartCard.tsx'

/** Required services for the toolview registration. */
export const inject = ['slots']

/**
 * Register the chart card for the `render_chart` tool. The key matches the wire
 * tool name, so the card renders inside that tool's call row in the chat flow.
 * @param ctx - client root context carrying the slots service.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject(
    'tool.call.toolview',
    () => ctx.slots.register({ name: 'tool.call.toolview', key: 'render_chart' }, ChartCard),
  )
}
