/**
 * Node half of the Dataxis chart card plugin. The `render_chart` tool itself is
 * registered by the Dataxis host plugin; this package contributes only the
 * browser card, so the node half owns no host-side effect.
 * @module @deepseek-ai/dsh-client-ui-dataxis-chart
 */

import type { Context } from '@deepseek-ai/cordis'

/** Cordis plugin name. */
export const name = 'ui-dataxis-chart'

/**
 * No host-side contribution: the inline chart card is client-only.
 * @param _ctx - unused host context.
 */
export function apply(_ctx: Context): void {}
