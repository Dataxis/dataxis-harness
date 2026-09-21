/** Tenant-token capture from the embedding page, including blocked-storage iframes. */

import { afterEach, describe, expect, it } from 'vitest'
import { readTenantToken, resetTenantTokenCache } from '../src/tenant-token.ts'

interface StorageStub {
  setItem: (key: string, value: string) => void
  getItem: (key: string) => string | null
}

const globals = globalThis as { window?: unknown }
const originalWindow = globals.window

function stubWindow(href: string, storage: StorageStub): void {
  globals.window = { location: { href }, sessionStorage: storage }
}

function memoryStorage(seed?: string): StorageStub {
  let value: string | undefined = seed
  return {
    setItem(_key: string, next: string) { value = next },
    getItem() { return value ?? null },
  }
}

afterEach(() => {
  if (originalWindow === undefined) delete globals.window
  else globals.window = originalWindow
  resetTenantTokenCache()
})

describe('readTenantToken', () => {
  it('reads the token the embedding page put in the URL', () => {
    stubWindow('http://127.0.0.1:3082/?tenant=abc.def', memoryStorage())
    expect(readTenantToken()).toBe('abc.def')
  })

  it('keeps the URL token when sessionStorage is blocked', () => {
    // An embedding page is a third-party context: writing storage throws there,
    // and that must not discard a token the URL already supplied.
    stubWindow('http://127.0.0.1:3082/?tenant=abc.def', {
      setItem() { throw new Error('storage blocked') },
      getItem() { throw new Error('storage blocked') },
    })
    expect(readTenantToken()).toBe('abc.def')
  })

  it('falls back to a remembered token when the query is absent', () => {
    stubWindow('http://127.0.0.1:3082/', memoryStorage('remembered.token'))
    expect(readTenantToken()).toBe('remembered.token')
  })

  it('returns undefined when neither the URL nor storage carries a token', () => {
    stubWindow('http://127.0.0.1:3082/', memoryStorage())
    expect(readTenantToken()).toBeUndefined()
  })

  it('resolves once per page load', () => {
    const storage = memoryStorage()
    stubWindow('http://127.0.0.1:3082/?tenant=first', storage)
    expect(readTenantToken()).toBe('first')
    stubWindow('http://127.0.0.1:3082/?tenant=second', storage)
    expect(readTenantToken()).toBe('first')
  })
})
