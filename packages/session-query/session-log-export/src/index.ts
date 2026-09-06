/** Session-log download command and Host-owned streaming route. */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { brandString } from '@deepseek-ai/dsh-brand'
import type {} from '@deepseek-ai/dsh-attachment'
import type { FsInfo, FsTarget } from '@deepseek-ai/dsh-fs'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  DEFAULT_SESSION_LOG_COMPRESSION_LEVEL,
  flushLiveSessionLog,
  readSessionLogText,
  sessionLogExportDeps,
  sessionLogZipFilename,
  streamSessionLogZip,
  type SessionLogCompressionLevel,
  type SessionLogExportReady,
} from './archive.ts'

export {
  DEFAULT_SESSION_LOG_COMPRESSION_LEVEL,
  flushLiveSessionLog,
  readSessionLogText,
  serializeSessionLog,
  SESSION_LOG_FILENAME,
  sessionLogExportDeps,
  sessionLogZipEntries,
  sessionLogZipFilename,
  streamSessionLogZip,
} from './archive.ts'
export type {
  SessionLogCompressionLevel,
  SessionLogExportDeps,
  SessionLogExportReady,
  SessionLogZipEntry,
} from './archive.ts'

export const name = 'session-log-download'
export const inject = ['commands', 'connection']

/** Stable browser download path retained across the transport migration. */
export const SESSION_LOG_EXPORT_PATH = '/api/session.export'

/** Stable browser path for produced-workspace-file downloads. */
export const WORKSPACE_FILE_PATH = '/api/workspace.file'

/** Session-log archive policy. */
export interface Config {
  /** DEFLATE level for each ZIP entry. @default 6 */
  readonly compressionLevel?: SessionLogCompressionLevel
}

/** Validate Session-log archive configuration. */
export const Config: Schema<Config> = Schema.object({
  compressionLevel: Schema.number().step(1).min(0).max(9)
    .default(DEFAULT_SESSION_LOG_COMPRESSION_LEVEL) as Schema<SessionLogCompressionLevel>,
})

interface SessionLogConnection {
  readonly fetch: {
    register(route: {
      readonly path: string
      readonly methods: readonly ('GET' | 'HEAD')[]
      readonly fetch: (request: Request) => Promise<Response>
    }): () => Promise<void>
  }
}

const REQUESTED: CommandResult = {
  kind: 'success',
  text: 'Session log download requested.',
}

/**
 * Register the Web-only `/export` command and authenticated ZIP download route.
 * @param ctx - Host context carrying the human-command registry.
 * @param config - resolved compression policy.
 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.effect(() => ctx.commands.register({
    name: 'export',
    description: 'Download this Session log as a ZIP archive',
    handler: invocation => Promise.resolve(invocation.rawInput.trim() === ''
      ? REQUESTED
      : { kind: 'error', text: 'The Web /export command does not accept a path.' }),
  }), 'session-log-download: command')
  connectionOf(ctx).fetch.register({
    path: SESSION_LOG_EXPORT_PATH,
    methods: ['GET', 'HEAD'],
    fetch: async (request) => {
      const response = await sessionLogExportResponse(
        ctx,
        request,
        config.compressionLevel ?? DEFAULT_SESSION_LOG_COMPRESSION_LEVEL,
      )
      if (request.method === 'GET') return response
      await response.body?.cancel()
      return new Response(null, { status: response.status, headers: response.headers })
    },
  })
  connectionOf(ctx).fetch.register({
    path: WORKSPACE_FILE_PATH,
    methods: ['GET', 'HEAD'],
    fetch: async (request) => {
      const response = await workspaceFileResponse(ctx, request)
      if (request.method === 'GET') return response
      await response.body?.cancel()
      return new Response(null, { status: response.status, headers: response.headers })
    },
  })
}

function connectionOf(ctx: Context): SessionLogConnection {
  return Reflect.get(ctx, 'connection') as SessionLogConnection
}

async function sessionLogExportResponse(
  ctx: Context,
  request: Request,
  compressionLevel: SessionLogCompressionLevel,
): Promise<Response> {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams)
  const sessionIdValue = query['sessionId']
  const descendantsValue = query['includeDescendants']
  if (sessionIdValue === undefined || sessionIdValue.length === 0
    || (descendantsValue !== undefined && descendantsValue !== 'true' && descendantsValue !== 'false')) {
    return new Response('missing or invalid sessionId query parameter', { status: 400 })
  }
  const sessionId = brandString<SessionId>(sessionIdValue)
  const deps = sessionLogExportDeps(ctx)
  if (deps.sessionQuery === undefined
    || deps.sessionPersistence === undefined
    || deps.attachments === undefined) {
    return new Response(
      'session log export is unavailable: missing session-query, session-persistence, or attachments service',
      { status: 500 },
    )
  }
  const ready: SessionLogExportReady = {
    sessionQuery: deps.sessionQuery,
    sessionPersistence: deps.sessionPersistence,
    attachments: deps.attachments,
    sessions: deps.sessions,
  }
  let rootContent: string | undefined
  try {
    await flushLiveSessionLog(deps, sessionId, request.signal)
    rootContent = await readSessionLogText(deps.sessionPersistence, sessionId, request.signal)
    request.signal.throwIfAborted()
  } catch {
    request.signal.throwIfAborted()
    // Root preparation failure (flush, open, or read): answer 500 without
    // echoing the error, which may carry absolute host paths into the
    // browser error bar.
    return new Response('session log export failed to read the stored log', { status: 500 })
  }
  if (rootContent === undefined) {
    return new Response('session not found', { status: 404 })
  }
  const response = new Response(
    streamSessionLogZip(
      ready,
      rootContent,
      sessionId,
      descendantsValue === 'true',
      compressionLevel,
      request.signal,
    ),
    {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${sessionLogZipFilename(sessionId)}"`,
      },
    },
  )
  return response
}

/** Maximum workspace-file byte size served by one download. */
const WORKSPACE_FILE_MAX_BYTES = 10 * 1024 * 1024

/** MIME types for the common workspace-file extensions a download may serve. */
const WORKSPACE_FILE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
}

/** The session-store slice the workspace-file download reads the owning cwd from. */
interface WorkspaceSessionsSurface {
  get(id: SessionId): { header: { cwd?: string } } | undefined
}

/** The filesystem slice the workspace-file download reads through. */
interface WorkspaceFileSystemSurface {
  resolve(path: string, opts?: { cwd?: string; signal?: AbortSignal }): Promise<FsTarget>
  contains(parent: FsTarget, child: FsTarget): boolean
  stat(target: FsTarget, signal?: AbortSignal): Promise<FsInfo | undefined>
  readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array>
}

function workspaceFileContentType(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1
    ? 'application/octet-stream'
    : WORKSPACE_FILE_CONTENT_TYPES[path.slice(dot).toLowerCase()] ?? 'application/octet-stream'
}

function workspaceFileBasename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/"/g, '')
}

/**
 * Stream one produced workspace file as an attachment. The path is the exact
 * workspace-relative (or cwd-absolute) display path the producing tool logged;
 * it resolves against the session cwd and refuses anything outside that root.
 * @param ctx - Host context carrying the sessions and fs services.
 * @param request - the browser GET/HEAD request carrying sessionId and path.
 * @returns the attachment response; 400 on a missing query, 404 on an unknown
 * session or absent file, 403 on a path escaping the workspace, 500 otherwise.
 */
async function workspaceFileResponse(ctx: Context, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const sessionIdValue = url.searchParams.get('sessionId')
  const path = url.searchParams.get('path')
  if (sessionIdValue === null || sessionIdValue === '' || path === null || path === '') {
    return new Response('missing sessionId or path query parameter', { status: 400 })
  }
  const sessionId = brandString<SessionId>(sessionIdValue)
  const fs = ctx.get('fs') as WorkspaceFileSystemSurface | undefined
  const sessions = ctx.get('sessions') as WorkspaceSessionsSurface | undefined
  if (fs === undefined || sessions === undefined) {
    return new Response('workspace file download is unavailable: missing fs or sessions service', { status: 500 })
  }
  const session = sessions.get(sessionId)
  if (session === undefined || session.header.cwd === undefined) {
    return new Response('workspace file download failed: unknown session', { status: 404 })
  }
  try {
    const cwdTarget = await fs.resolve(session.header.cwd, { signal: request.signal })
    const fileTarget = await fs.resolve(path, { cwd: session.header.cwd, signal: request.signal })
    if (!fs.contains(cwdTarget, fileTarget)) {
      return new Response('workspace file download failed: path escapes the workspace', { status: 403 })
    }
    const info = await fs.stat(fileTarget, request.signal)
    if (info === undefined || info.type !== 'file') {
      return new Response('workspace file download failed: not a file', { status: 404 })
    }
    const bytes = await fs.readBytes(fileTarget, request.signal, WORKSPACE_FILE_MAX_BYTES)
    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        'content-type': workspaceFileContentType(path),
        'content-disposition': `attachment; filename="${workspaceFileBasename(path)}"`,
      },
    })
  } catch {
    return new Response('workspace file download failed', { status: 500 })
  }
}
