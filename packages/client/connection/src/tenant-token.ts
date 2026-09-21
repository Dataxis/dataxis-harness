/**
 * Tenant token the browser page was opened with.
 *
 * An embedding page hands the tenant to the app as `?tenant=<signed token>`.
 * The client keeps it for the browsing session and forwards it on every `/api`
 * request so the Host can resolve the tenant per request. Both halves of that
 * exchange share {@link TENANT_TOKEN_HEADER}; this module holds no Node imports
 * so the browser bundle can use it directly.
 *
 * The URL is authoritative and is read at first use, before any client routing
 * can rewrite it. `sessionStorage` is only a best-effort backup for a later
 * reload: an embedding iframe is a third-party context, where reading or
 * writing storage can throw, and that must never discard a token the URL
 * already supplied.
 * @module @deepseek-ai/dsh-client-connection/tenant-token
 */

/** Query parameter supplying the signed tenant token. */
export const TENANT_QUERY = 'tenant'

/** Request header carrying the token from the client to the Host connection. */
export const TENANT_TOKEN_HEADER = 'x-tenant-token'

const STORAGE_KEY = 'dsh-tenant-token'

let resolved: string | undefined = undefined

/** Tenant token from this page's URL, when it carries one. */
function urlTenant(): string | undefined {
  /* v8 ignore next -- the browser bundle always has a window. */
  if (typeof window === 'undefined') return undefined
  try {
    const value = new URL(window.location.href).searchParams.get(TENANT_QUERY)
    return value === null || value === '' ? undefined : value
  } catch {
    // A non-absolute location cannot yield a query; treat it as absent.
    return undefined
  }
}

/** Remember the token for reloads that drop the query. Storage may be blocked. */
function remember(token: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Third-party iframe or private mode: the URL already carried the token.
  }
}

/** Recall a token stored by an earlier load that had it in the URL. */
function recall(): string | undefined {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Read the tenant token for this browsing session.
 * @returns the signed tenant token, or undefined when the page carries none.
 */
export function readTenantToken(): string | undefined {
  if (resolved !== undefined) return resolved
  const fromUrl = urlTenant()
  if (fromUrl !== undefined) {
    resolved = fromUrl
    remember(fromUrl)
    return resolved
  }
  resolved = recall()
  return resolved
}

/** Drop the memoized token. Test-only: the browser bundle reads it once per load. */
export function resetTenantTokenCache(): void {
  resolved = undefined
}
