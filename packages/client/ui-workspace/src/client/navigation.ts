/** Workspace archive and directory UI capability. */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { ClientRemote, DirectoryListing, RemoteFailure } from '@deepseek-ai/dsh-api-remotes/client'
import type {
  ISessions,
  SessionListState,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  IWorkspaces, WorkspaceId, WorkspaceView,
} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Workspace archive and directory operations consumed by Client UI domains. */
export interface UiWorkspace {
  /**
   * Why the most recent New Session attempt failed, or undefined.
   *
   * A refused creation used to be invisible: the caller logged a warning and the
   * conversation stayed in its provisioning state forever, showing a loading
   * indicator for a session that was never coming. The hero reads this to say what
   * happened instead of spinning.
   */
  readonly sessionFailure: SessionFailureSource
  /**
   * Resolve the reusable or newly created blank Session for a Workspace.
   * @param workspaceId - target Workspace.
   * @returns a Session already addressable through the Session Controller.
   */
  connectWorkspace(workspaceId: WorkspaceId): Promise<SessionId>
  /**
   * Start a New Session flow and navigate to its Session.
   * @param workspaceId - explicit target; absent inherits the current or most recent Workspace.
   */
  startSession(workspaceId?: WorkspaceId): void
  /**
   * Archive a Session and clear it when it is the current selection.
   * @param sessionId - Session to archive.
   */
  archiveSession(sessionId: SessionId): Promise<void>
  /**
   * Open the Host-native directory picker.
   * @returns the selected directory, or null when cancelled.
   */
  pickDirectory(): Promise<string | null>
  /**
   * List one Host directory level.
   * @param path - directory path; absent selects the Host home.
   * @param signal - cancellation for a superseded scan.
   * @returns directory entries and breadcrumb ancestry.
   */
  listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing>
  /**
   * Create a child directory.
   * @param path - existing parent directory.
   * @param name - child directory name.
   * @returns created absolute path.
   */
  createDirectory(path: string, name: string): Promise<string>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Cross-Controller Workspace navigation and directory UI capability. */
    uiWorkspace: UiWorkspace
  }
}

/** Structured directory failure exposed to directory UI consumers. */
export class DirectoryBrowseError extends Error {
  override readonly name = 'DirectoryBrowseError'

  /** @param rpcError - Host directory business failure. */
  constructor(readonly rpcError: RemoteFailure) {
    super(`directory browse failed: ${rpcError.code}: ${rpcError.message}`)
  }
}

/** Implements Workspace archive and directory UI operations. */
/** Why a New Session attempt failed, in a form a surface can localize. */
export type SessionFailure =
  /** The caller is not a registered tenant — the DSH refused the Session outright. */
  | { readonly kind: 'unregistered' }
  /** Anything else, reported verbatim because only the Host knows what it means. */
  | { readonly kind: 'other'; readonly message: string }

/** Observable source of the last failed New Session attempt. */
export interface SessionFailureSource {
  /** @returns the failure, or undefined when the last attempt resolved. */
  getSnapshot(): SessionFailure | undefined
  /**
   * @param listener - called whenever the message changes.
   * @returns disposer withdrawing the listener.
   */
  subscribe(listener: () => void): () => void
}

class UiWorkspaceService extends Service implements UiWorkspace {
  private readonly connecting = new Map<WorkspaceId, Promise<SessionId>>()
  private failure: SessionFailure | undefined
  private readonly failureListeners = new Set<() => void>()

  readonly sessionFailure: SessionFailureSource = {
    getSnapshot: () => this.failure,
    subscribe: (listener) => {
      this.failureListeners.add(listener)
      return () => { this.failureListeners.delete(listener) }
    },
  }

  private setFailure(failure: SessionFailure | undefined): void {
    if (this.failure === failure) return
    this.failure = failure
    for (const listener of [...this.failureListeners]) listener()
  }

  /**
   * Classify a rejected creation.
   *
   * `session/tenant-scope-required` is the tenant gate refusing: the signed identity
   * resolved to no registered company, which is a state the caller can explain rather
   * than report verbatim. Everything else is surfaced as-is, since only the Host knows
   * what it means.
   * @param reason - the rejection value.
   * @returns the failure to publish.
   */
  private static classify(reason: unknown): SessionFailure {
    // Three wrappers reach here: SessionCreateError (whose `rpcError` is the Host's
    // RemoteFailure), a bare RemoteFailure from another call, and a folded transport
    // error. Read the code from each, then fall back to the refusal's own wording so
    // a renamed code still surfaces as the registered-identity message.
    const shape = reason as
      | { rpcError?: { code?: unknown }; code?: unknown; error?: { code?: unknown }; message?: unknown }
      | undefined
    const code = shape?.rpcError?.code ?? shape?.code ?? shape?.error?.code
    if (code === 'session/tenant-scope-required') return { kind: 'unregistered' }
    const message = typeof shape?.message === 'string' ? shape.message : String(reason)
    // The Host composes "session refused: Error: no data-access scope for <email>".
    if (/no data-access scope|tenant-scope/.test(message)) return { kind: 'unregistered' }
    return { kind: 'other', message }
  }

  /**
   * @param ctx - Client root Context.
   * @param directoryPicker - the directory-picking Remote namespace.
   * @param workspaces - pure Workspace Controller.
   * @param sessions - pure Session Controller.
   * @param tenantActive - whether the page carries a tenant token; a tenant page
   *   never lists Workspaces, so it creates its Session without one.
   */
  constructor(
    ctx: Context,
    private readonly directoryPicker: ClientRemote['directoryPicker'],
    private readonly workspaces: IWorkspaces,
    private readonly sessions: ISessions,
    private readonly tenantActive: () => boolean,
  ) {
    super(ctx, 'uiWorkspace')
    ctx.effect(() => this.watchNavigation(), 'ui-workspace: Workspace navigation policy')
  }

  async connectWorkspace(workspaceId: WorkspaceId): Promise<SessionId> {
    const workspace = this.workspaces.list.getSnapshot().items
      .find(item => item.workspaceId === workspaceId)
    if (workspace === undefined) {
      throw new Error(`uiWorkspace.connectWorkspace: unknown workspace ${workspaceId}`)
    }
    const inflight = this.connecting.get(workspaceId)
    if (inflight !== undefined) return inflight

    const archived = this.workspaces.list.getSnapshot().archivedSessionIds
    const sessions = this.sessions.list.getSnapshot()
    for (const id of sessions.ids) {
      const summary = sessions.byId[id]
      if (summary !== undefined && summary.blank && summary.cwd === workspace.path
        && workspace.sessionIds.includes(summary.id)
        && !archived.includes(summary.id)) return summary.id
    }

    const attempt = this.sessions.create({ workspaceId })
      .finally(() => { this.connecting.delete(workspaceId) })
    this.connecting.set(workspaceId, attempt)
    return attempt
  }

  startSession(workspaceId?: WorkspaceId): void {
    const workspace = this.workspaces.list.getSnapshot()
    const sessions = this.sessions.list.getSnapshot()
    const current = sessions.current
    const currentWorkspaceId = current === undefined
      ? undefined
      : workspace.items.find(item => item.sessionIds.includes(current))?.workspaceId
    const recent = workspace.phase === 'ready' && sessions.phase === 'ready'
      ? recentWorkspace(workspace.items, sessions.byId)
      : undefined
    const target = workspaceId ?? currentWorkspaceId ?? recent
    if (target === undefined) {
      // The tenant's Workspace IS the Session, and its cwd comes from the token,
      // so there is nothing to pick. Creating without a workspaceId is the whole
      // flow: the Session Controller resolves the tenant's cwd server-side.
      if (this.tenantActive()) {
        this.createTenantSession()
        return
      }
      this.sessions.clear()
      return
    }
    void this.connectWorkspace(target).then(
      (sessionId) => { this.setFailure(undefined); this.sessions.open(sessionId) },
      (reason: unknown) => { this.setFailure(UiWorkspaceService.classify(reason)) },
    )
  }

  private createTenantSession(): void {
    void this.sessions.create({}).then(
      (sessionId) => { this.setFailure(undefined); this.sessions.open(sessionId) },
      (reason: unknown) => { this.setFailure(UiWorkspaceService.classify(reason)) },
    )
  }

  async archiveSession(sessionId: SessionId): Promise<void> {
    await this.workspaces.archiveSession(sessionId)
  }

  async pickDirectory(): Promise<string | null> {
    const result = await this.directoryPicker.pick()
    if (!result.ok) throw new Error(`directory picker failed: ${result.error.message}`)
    return result.value
  }

  async listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing> {
    const result = await this.directoryPicker.list(path, signal)
    if (!result.ok) throw new DirectoryBrowseError(result.error)
    return result.value
  }

  async createDirectory(path: string, name: string): Promise<string> {
    const result = await this.directoryPicker.createDirectory(path, name)
    if (!result.ok) throw new DirectoryBrowseError(result.error)
    return result.value
  }

  private watchNavigation(): () => void {
    let initial: 'waiting' | 'connecting' | 'done' = 'waiting'
    let disposed = false
    const reconcile = (): void => {
      if (disposed) return
      if (this.clearArchivedCurrent()) return
      if (initial !== 'waiting') return
      const sessions = this.sessions.list.getSnapshot()
      if (sessions.phase !== 'ready') return
      // A tenant page lists only Sessions, so its Workspace list is never
      // fetched. Requiring it to be ready would stall the auto-connect forever:
      // no picker, no Workspace load, no Session, still provisioning.
      const tenantPage = this.tenantActive()
      const workspace = tenantPage ? undefined : this.workspaces.list.getSnapshot()
      if (workspace !== undefined && workspace.phase !== 'ready') return
      if (sessions.current !== undefined) {
        initial = 'done'
        return
      }
      const target = workspace === undefined
        ? undefined
        : recentWorkspace(workspace.items, sessions.byId)
      if (target === undefined && !tenantPage) {
        initial = 'done'
        return
      }
      initial = 'connecting'
      void (target === undefined ? this.sessions.create({}) : this.connectWorkspace(target)).then(
        (sessionId) => {
          if (disposed) return
          this.setFailure(undefined)
          if (this.sessions.list.getSnapshot().current === undefined) {
            this.sessions.open(sessionId)
          }
          initial = 'done'
        },
        (reason: unknown) => {
          if (disposed) return
          initial = 'waiting'
          // The boot-time auto-connect is the path a tenant page takes, so its refusal
          // has to reach the surface too — this handler is separate from startSession's.
          this.setFailure(UiWorkspaceService.classify(reason))
        },
      )
    }
    const disposeWorkspaces = this.workspaces.list.subscribe(reconcile)
    const disposeSessions = this.sessions.list.subscribe(reconcile)
    reconcile()
    return () => {
      disposed = true
      disposeSessions()
      disposeWorkspaces()
    }
  }

  /** @returns true when an archived current selection was cleared. */
  private clearArchivedCurrent(): boolean {
    const current = this.sessions.list.getSnapshot().current
    if (current === undefined
      || !this.workspaces.list.getSnapshot().archivedSessionIds.includes(current)) return false
    this.sessions.clear()
    return true
  }

}

/** Stable tie-breaking follows Host Workspace order. */
function recentWorkspace(
  workspaces: readonly WorkspaceView[],
  sessions: SessionListState['byId'],
): WorkspaceId | undefined {
  let selected: WorkspaceId | undefined
  let selectedTime = Number.NEGATIVE_INFINITY
  for (const workspace of workspaces) {
    let latest = Number.NEGATIVE_INFINITY
    for (const sessionId of workspace.sessionIds) {
      const session = sessions[sessionId]
      if (session !== undefined) latest = Math.max(latest, session.updatedAt)
    }
    if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt)
    if (selected === undefined || latest > selectedTime) {
      selected = workspace.workspaceId
      selectedTime = latest
    }
  }
  return selected
}

export { UiWorkspaceService }
