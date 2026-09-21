// The composer remains in ConversationRoot so switching out of the blank-draft
// phase does not remount its textarea.

import type { ReactNode, RefObject } from 'react'
import clsx from 'clsx'
import {
  DataxisLogo, IconChevronDownOutline14, IconFolderClose16, IconFolderOpen16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { workspaceTitleOf } from '@deepseek-ai/dsh-util-workspace-path'
import type { ConversationSlotProps, SessionFailure } from '../contract/slots.ts'
import css from './HeroShell.module.css'

/** The owner's locale seat type, passed to hero chrome as a plain prop. */
type HeroTranslate = ConversationSlotProps['t']

/**
 * Basename label for the workspace chip (the shared derivation);
 * separator-only paths echo the raw cwd.
 * @param cwd - workspace directory path (non-empty).
 * @returns chip label.
 */
export function workspaceLabel(cwd: string): string {
  const base = workspaceTitleOf(cwd)
  return base !== '' ? base : cwd
}

/**
 * The workspace chip (folder + label + chevron), always interactive: before
 * the first message the workspace stays switchable — picking another one
 * moves the New Session flow to that workspace's blank session. Without a
 * label the chip renders its placeholder state: closed folder + the
 * "Choose workspace" call to action.
 * @param props.label - chip label (see {@link workspaceLabel}); omitted → placeholder.
 * @param props.menuOpen - menu expansion echo.
 * @param props.onClick - menu toggle.
 * @returns the chip button element.
 */
export function WorkspaceChip({ buttonRef, label, menuOpen = false, onClick, t }: {
  buttonRef?: RefObject<HTMLButtonElement>
  label?: string | undefined
  menuOpen?: boolean
  onClick?: () => void
  t: HeroTranslate
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={css.workspace}
      aria-label={t('hero.chooseWorkspace')}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={onClick}
    >
      {label === undefined
        ? <IconFolderClose16 className={css.folder} size={16} />
        : <IconFolderOpen16 className={css.folder} size={16} />}
      <span className={css.workspaceLabel}>{label ?? t('hero.chooseWorkspace')}</span>
      <IconChevronDownOutline14 className={css.chevron} size={12} />
    </button>
  )
}

/** Hero chrome props. The workspace row rides the InputBar accessory hole, not here. */
export interface HeroShellProps {
  /** The owner's locale seat, passed down as a plain prop. */
  t: HeroTranslate
  /** Authorized renderer for the hero brand-mark slot. */
  renderSlot: ConversationSlotProps['renderSlot']
  /**
   * True while the session is still being provisioned on a tenant page (cold
   * start, before any session exists). The workspace is created server-side
   * first, so the mark shimmers behind a status line instead of leaving the
   * picker's empty state.
   */
  provisioning?: boolean
  /**
   * Why provisioning failed, when it did. A refused Session never arrives, so the
   * loader would spin forever; this replaces it with the reason. Declared with an
   * explicit `undefined` because callers pass the ternary result directly.
   */
  failure?: SessionFailure | undefined
  /** Overlay content after the stack (modals). */
  children?: ReactNode
}


/**
 * Render the hero chrome (brand wordmark only; no composer, no workspace row).
 * @param props - see {@link HeroShellProps}.
 * @returns the centered hero element tree.
 */
export function HeroShell({ t, renderSlot, provisioning = false, failure, children }: HeroShellProps) {
  const markClass = clsx(css.wordmark, provisioning && css.wordmarkLoading)
  // The shimmer rides the HTML wrapper: the brand mark is an <svg>, which renders
  // no pseudo-elements, so the sweep cannot be drawn on the mark itself.
  const brandClass = clsx(css.brandName, provisioning && css.brandShimmer)
  return (
    <div className={css.root}>
      <div className={css.stack}>
        <div className={css.brand}>
          <span className={brandClass} role="img" aria-label={t('hero.brandLabel')}>
            {renderSlot('conversation.hero.brand.mark', { size: 34, className: markClass }, {
              fallback: <DataxisLogo size={34} className={markClass} />,
            })}
          </span>
        </div>
        {provisioning && (
          <p className={css.provisioning} role={failure === undefined ? 'status' : 'alert'}>
            {/* No spinner on failure: nothing is in flight any more. */}
            {failure === undefined && <span className={css.spinner} aria-hidden />}
            {failure === undefined
              ? t('hero.provisioning')
              : failure.kind === 'unregistered'
                ? t('hero.unregistered')
                : failure.message}
          </p>
        )}
        <div className={css.body}>
          {/* The composer remains mounted outside this component. */}
        </div>
      </div>
      {children}
    </div>
  )
}
