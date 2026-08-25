/**
 * Live intermediary-step visibility preferences. It owns the two reactive
 * booleans and resolves their durable values from the Host settings scope.
 */
import {
  createSnapshotStore, type SettingsScope, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { AppearanceSettings } from '../appearance-settings.ts'
import { SHOW_REASONING_FIELD, SHOW_TOOL_CALLS_FIELD } from '../appearance-settings.ts'

/**
 * Appearance policy used by the chat renderer and its composer control.
 * Absent compositions stay process-local with both rows visible.
 */
export class AppearanceSettingsStore {
  /** Reactive tool-call visibility source for the chat flow. */
  readonly showToolCalls: SnapshotStore<boolean> = createSnapshotStore(true)
  /** Reactive reasoning visibility source for the chat flow. */
  readonly showReasoning: SnapshotStore<boolean> = createSnapshotStore(true)
  private readonly host: SettingsScope<AppearanceSettings> | undefined

  /**
   * @param host - durable preference scope owned by the providing plugin;
   * absent compositions stay process-local.
   */
  constructor(host?: SettingsScope<AppearanceSettings>) {
    this.host = host
    if (host !== undefined) {
      host.subscribe(() => { this.adopt(host) })
      this.adopt(host)
    }
  }

  /**
   * Change tool-call visibility; the live value publishes before the durable write.
   * @param value - whether tool-call rows render.
   */
  setShowToolCalls(value: boolean): void {
    if (this.showToolCalls.getSnapshot() === value) return
    this.showToolCalls.set(value)
    void this.host?.set(SHOW_TOOL_CALLS_FIELD, value)
  }

  /**
   * Change reasoning visibility; the live value publishes before the durable write.
   * @param value - whether reasoning rows render.
   */
  setShowReasoning(value: boolean): void {
    if (this.showReasoning.getSnapshot() === value) return
    this.showReasoning.set(value)
    void this.host?.set(SHOW_REASONING_FIELD, value)
  }

  /**
   * Adopt the scope's accepted durable values without writing them back.
   * @param host - the constructor-narrowed scope driving this adoption.
   */
  private adopt(host: SettingsScope<AppearanceSettings>): void {
    const section = host.getSnapshot().value
    if (section === undefined) return
    if (this.showToolCalls.getSnapshot() !== section.showToolCalls) this.showToolCalls.set(section.showToolCalls)
    if (this.showReasoning.getSnapshot() !== section.showReasoning) this.showReasoning.set(section.showReasoning)
  }
}
