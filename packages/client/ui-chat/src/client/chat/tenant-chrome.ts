/**
 * Whether this page is the embedded tenant surface rather than an operator's direct
 * visit. Read once per page: the tenant token comes from the URL at load and is
 * memoized, so the value cannot change while the page lives, and the plugin's
 * `apply` reads it before any node renders.
 */
let hidden = false

/**
 * @param value - true when the page carries a tenant token.
 */
export function setTenantChromeHidden(value: boolean): void {
  hidden = value
}

/**
 * @returns true when the Turn process disclosure and inline reasoning stay hidden.
 */
export function tenantChromeHidden(): boolean {
  return hidden
}
