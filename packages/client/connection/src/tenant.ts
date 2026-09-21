/**
 * Request-scoped tenant token for the Host connection.
 *
 * The web client forwards the tenant token it read from `?tenant=` on every
 * `/api` request as the `x-tenant-token` header. The connection carries that
 * value through the request's async chain so host code running on behalf of the
 * request (the session controller, the tenant plugin) can resolve the tenant
 * without threading the request object through every call.
 * @module @deepseek-ai/dsh-client-connection/tenant
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import { TENANT_TOKEN_HEADER } from './tenant-token.ts'

/** Tenant header the web client sets from the `?tenant=` query value. */
export { TENANT_TOKEN_HEADER }

const store = new AsyncLocalStorage<string>()

/**
 * Run `fn` with the request's tenant token available to readers.
 * @param token - signed tenant token, or undefined when the request carries none.
 * @param fn - work that resolves on behalf of this request.
 * @returns the callback's return value.
 */
export function runWithTenantToken<T>(token: string | undefined, fn: () => T): T {
  return token === undefined || token === '' ? fn() : store.run(token, fn)
}

/**
 * Read the current request's tenant token.
 * @returns the token carried by this request, or undefined outside a request.
 */
export function currentTenantToken(): string | undefined {
  return store.getStore()
}
