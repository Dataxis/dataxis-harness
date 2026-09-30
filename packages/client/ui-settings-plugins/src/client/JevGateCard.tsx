/** The jev gate's card: the switches that decide what the gate does to a turn. */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ValueField } from './fields.tsx'
import { PluginCard } from './PluginCard.tsx'
import type { CardFieldState } from './card-form.ts'
import type { JevGateCardFace } from './jev-gate-card-controller.ts'
import type {} from './slot-contract.ts'

/** Props the renderer binds for the jev-gate card. */
export type JevGateCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.plugins'>
  & InjectFace<JevGateCardFace>

/** The switches this card renders as checkboxes, in reading order. */
const SWITCHES = ['precheck', 'dryRun', 'block'] as const

/**
 * Render the jev-gate card.
 *
 * A switch stages through the same edit path a text field uses — the draft is the string
 * `true` or `false`, which the form's boolean spec parses — so the card inherits the
 * existing save, discard and reset semantics instead of writing on every click. Nothing
 * here takes effect until Save, which is what makes the pending change reviewable.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function JevGateCard(props: JevGateCardProps) {
  const { t } = props
  const state = props.useJevGateCard(snapshot => snapshot)
  const switchField = (field: typeof SWITCHES[number], fieldState: CardFieldState) => (
    <label key={field} data-jev-switch={field}>
      <input
        type="checkbox"
        checked={fieldState.text === 'true'}
        disabled={!state.writable || state.saving || fieldState.invalid}
        onChange={(event) => { props.edit(field, event.target.checked ? 'true' : 'false') }}
      />
      <span>{t(field)}</span>
      {fieldState.overridden ? <span>{t('overridden')}</span> : null}
      <span>{t(`${field}Hint` as 'precheckHint')}</span>
    </label>
  )
  return (
    <PluginCard
      t={t}
      titleKey="jevGateTitle"
      descriptionKey="jevGateDescription"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      {switchField('precheck', state.precheck)}
      {switchField('dryRun', state.dryRun)}
      {switchField('block', state.block)}
      <ValueField
        id="plugin-config-jev-min-tool-calls"
        label={t('minToolCalls')}
        hint={t('minToolCallsHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={!state.writable}
        {...state.minToolCalls}
        onEdit={(text) => { props.edit('minToolCalls', text) }}
        onReset={() => { props.resetField('minToolCalls') }}
      />
      <ValueField
        id="plugin-config-jev-session-cap"
        label={t('sessionCap')}
        hint={t('sessionCapHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={!state.writable}
        {...state.sessionCap}
        onEdit={(text) => { props.edit('sessionCap', text) }}
        onReset={() => { props.resetField('sessionCap') }}
      />
    </PluginCard>
  )
}
