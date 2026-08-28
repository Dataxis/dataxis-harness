/**
 * downloads domain contract: host-only download surfaces — the GET-download
 * channel family, the mirror of the SSE-stream `events` domain. No wire
 * envelope: the carrier's GET routes answer these directly, and the browser
 * `IApiClient` never exposes them.
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Host-only download surfaces (no wire envelope; absent from IApiClient). */
export interface DownloadsApi {
  /**
   * Stream one session-log ZIP — the root artifact verbatim plus each subagent
   * descendant's — as an attachment response. The carrier's GET route answers
   * this directly; the browser never calls it.
   * @param request - the root session id and whether to include descendants.
   * @param signal - cancellation for the underlying reads.
   * @returns the ZIP attachment response; missing services answer 500 and a
   * missing root session 404 before any byte is produced.
   */
  sessionLog(
    request: { sessionId: SessionId; includeDescendants?: boolean },
    signal: AbortSignal,
  ): Promise<Response>

  /**
   * Stream one file from a session's workspace as an attachment response. The
   * path is the exact workspace-relative (or cwd-absolute) `displayPath` the
   * producing tool logged; the implementation resolves it against the session
   * cwd and refuses any path outside that root. The carrier's GET route
   * answers this directly; the browser never calls it.
   * @param request - the owning session id and the workspace path to download.
   * @param signal - cancellation for the underlying read.
   * @returns the file attachment response; a missing service answers 500, a
   * missing session 404, an escaped path 403, and an absent file 404.
   */
  workspaceFile(
    request: { sessionId: SessionId; path: string },
    signal: AbortSignal,
  ): Promise<Response>
}
