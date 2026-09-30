/** The jev-gate card's staged form over the `jev-gate` settings namespace. */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  booleanField, CardForm, numberField,
  type CardActions, type CardFieldState, type CardShell,
} from './card-form.ts'

/**
 * Namespace of the jev gate's settings. Spelled here rather than imported: a
 * client package must not depend on a Host package.
 */
export const JEV_GATE_NS = 'jev-gate'

/**
 * The jev-gate fields this card edits.
 *
 * The gate's other sections — the classifier's questions and criteria, the API key, the
 * dispatch prompt — are deliberately absent: they are composition, not per-deployment
 * choices, and editing them from a browser would put the classifier's rubric under a
 * surface that has no review step.
 */
export interface JevGateSettings {
  /** Ask the classifier only for turns the local pass admits. */
  precheck?: boolean
  /** Tool calls a turn needs before the classifier is asked. */
  minToolCalls?: number
  /** Dispatches allowed per session. */
  sessionCap?: number
  /** Record the decision without dispatching the audit subagent. */
  dryRun?: boolean
  /** Refuse a turn the classifier blocks, before the model is called. */
  block?: boolean
}

/** What the jev-gate card renders. */
export interface JevGateCardState extends CardShell {
  /** Local pre-check switch. */
  precheck: CardFieldState
  /** Tool-call floor. */
  minToolCalls: CardFieldState
  /** Per-session dispatch ceiling. */
  sessionCap: CardFieldState
  /** Dispatch switch. */
  dryRun: CardFieldState
  /** Refusal switch. */
  block: CardFieldState
}

/** The registration-side face the jev-gate card's slot entry injects. */
export interface JevGateCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as useJevGateCard. */
    jevGateCard: SnapshotStore<JevGateCardState>
  }
}

/** Bridges the `jev-gate` scope onto the card's staged form. */
export class JevGateCardController {
  private readonly form: CardForm<JevGateSettings>
  private readonly store: SnapshotStore<JevGateCardState>

  /** @param scope - the bound settings scope for the `jev-gate` namespace. */
  constructor(scope: SettingsScope<JevGateSettings>) {
    this.form = new CardForm(scope, [
      booleanField('precheck'),
      numberField('minToolCalls'),
      numberField('sessionCap'),
      booleanField('dryRun'),
      booleanField('block'),
    ])
    this.store = this.form.bind(() => this.projection())
  }

  private projection(): JevGateCardState {
    return {
      ...this.form.shell(),
      precheck: this.form.field('precheck'),
      minToolCalls: this.form.field('minToolCalls'),
      sessionCap: this.form.field('sessionCap'),
      dryRun: this.form.field('dryRun'),
      block: this.form.field('block'),
    }
  }

  /**
   * Build the face the card's slot registration injects.
   * @returns the card's snapshot and its form actions.
   */
  inject(): JevGateCardFace {
    return { hooks: { jevGateCard: this.store }, ...this.form.actions() }
  }
}
