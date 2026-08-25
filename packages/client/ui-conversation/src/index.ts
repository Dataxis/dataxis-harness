/** Host registration for browser conversation preferences. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { APPEARANCE_SETTINGS_NAMESPACE, AppearanceSettingsSchema } from './appearance-settings.ts'
import { CONVERSATION_SETTINGS_NAMESPACE, ConversationSettingsSchema } from './submission-settings.ts'

export {
  BUSY_ENTER_BEHAVIORS, BUSY_ENTER_FIELD, CONVERSATION_SETTINGS_NAMESPACE,
  DEFAULT_BUSY_ENTER_BEHAVIOR, type BusyEnterBehavior, type ConversationSettings,
} from './submission-settings.ts'
export {
  APPEARANCE_SETTINGS_NAMESPACE, SHOW_REASONING_FIELD, SHOW_TOOL_CALLS_FIELD,
  type AppearanceSettings,
} from './appearance-settings.ts'

/**
 * Register the durable conversation sections when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the sections.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(CONVERSATION_SETTINGS_NAMESPACE),
      ConversationSettingsSchema,
    )
    settingsCtx.settings.register(
      settingsNamespace(APPEARANCE_SETTINGS_NAMESPACE),
      AppearanceSettingsSchema,
    )
  })
}
