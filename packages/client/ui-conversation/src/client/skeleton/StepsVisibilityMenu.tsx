/** Composer control for intermediary-step visibility (tool calls / reasoning). */
import { useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuItem } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationKey } from '../locales.ts'
import css from './StepsVisibilityMenu.module.css'

/** Registration-side step-visibility face. */
export interface StepsVisibilityMenuInjected {
  hooks: {
    /** Persisted tool-call visibility bound as useShowToolCalls. */
    showToolCalls: SnapshotStore<boolean>
    /** Persisted reasoning visibility bound as useShowReasoning. */
    showReasoning: SnapshotStore<boolean>
  }
  /** Change tool-call visibility. */
  setShowToolCalls: (value: boolean) => void
  /** Change reasoning visibility. */
  setShowReasoning: (value: boolean) => void
}

/** Full composer-control props. */
export type StepsVisibilityMenuProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'conversation'>
  & InjectFace<StepsVisibilityMenuInjected>

/** Combined step-visibility modes exposed by the control. */
type StepMode = 'both' | 'hideToolCalls' | 'hideReasoning' | 'hideBoth'

const OPTIONS: readonly { id: StepMode; label: ConversationKey }[] = [
  { id: 'both', label: 'steps.showBoth' },
  { id: 'hideToolCalls', label: 'steps.hideToolCalls' },
  { id: 'hideReasoning', label: 'steps.hideReasoning' },
  { id: 'hideBoth', label: 'steps.hideBoth' },
]

/**
 * Render the step-visibility selector as a composer tool-row chip.
 * @param props - composed composer-region slot props.
 * @returns the chip and its menu.
 */
export function StepsVisibilityMenu({
  useShowToolCalls, useShowReasoning, setShowToolCalls, setShowReasoning, t,
}: StepsVisibilityMenuProps) {
  const showToolCalls = useShowToolCalls(s => s)
  const showReasoning = useShowReasoning(s => s)
  const [open, setOpen] = useState(false)
  const mode: StepMode = !showToolCalls
    ? (showReasoning ? 'hideToolCalls' : 'hideBoth')
    : (showReasoning ? 'both' : 'hideReasoning')

  const items: readonly MenuItem[] = OPTIONS.map(option => ({ id: option.id, label: t(option.label) }))
  const selectedLabel = t(OPTIONS.find(option => option.id === mode)!.label)

  const apply = (id: string): void => {
    setOpen(false)
    switch (id) {
      case 'hideToolCalls':
        setShowToolCalls(false)
        setShowReasoning(true)
        return
      case 'hideReasoning':
        setShowToolCalls(true)
        setShowReasoning(false)
        return
      case 'hideBoth':
        setShowToolCalls(false)
        setShowReasoning(false)
        return
      default:
        setShowToolCalls(true)
        setShowReasoning(true)
    }
  }

  return (
    <Menu
      open={open}
      items={items}
      selectedId={mode}
      onSelect={apply}
      onClose={() => { setOpen(false) }}
      side="top"
      anchor={(
        <button
          type="button"
          className={css.trigger}
          aria-label={t('steps.title')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          <span className={css.triggerLabel}>{selectedLabel}</span>
          <span className={css.chevron} aria-hidden><IconChevronDownOutline14 /></span>
        </button>
      )}
    />
  )
}
