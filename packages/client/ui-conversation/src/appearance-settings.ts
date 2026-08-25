/** Intermediary-step visibility preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the conversation plugin for chat rendering preferences. */
export const APPEARANCE_SETTINGS_NAMESPACE = 'appearance'

/** Field controlling whether tool-call rows render in the chat flow. */
export const SHOW_TOOL_CALLS_FIELD = 'showToolCalls'

/** Field controlling whether reasoning ("Think") rows render in the chat flow. */
export const SHOW_REASONING_FIELD = 'showReasoning'

/** Durable chat rendering preferences shared by the Host schema and the browser scope. */
export interface AppearanceSettings {
  /** Whether tool-call rows render in the chat flow (default true). */
  showToolCalls: boolean
  /** Whether reasoning rows render in the chat flow (default true). */
  showReasoning: boolean
}

/** Durable appearance schema; also the wire envelope the browser scope validates against. */
export const AppearanceSettingsSchema: z<AppearanceSettings> = z.object({
  [SHOW_TOOL_CALLS_FIELD]: z.boolean().default(true),
  [SHOW_REASONING_FIELD]: z.boolean().default(true),
})
