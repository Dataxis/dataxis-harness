// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocumentTitle } from '../src/client/DocumentTitle.tsx'

afterEach(() => {
  cleanup()
  document.title = ''
  vi.unstubAllEnvs()
})

describe('DocumentTitle', () => {
  it('projects a durable title and restores the product title', () => {
    vi.stubEnv('DSH_CLIENT_TITLE', 'Dataxis')
    document.title = 'stale title'
    const mounted = render(<DocumentTitle productTitle="Dataxis" />)
    expect(document.title).toBe('Dataxis')
    mounted.rerender(<DocumentTitle title="First title" productTitle="Dataxis" />)
    expect(document.title).toBe('First title — Dataxis')
    mounted.rerender(<DocumentTitle title="Revised title" productTitle="Dataxis" />)
    expect(document.title).toBe('Revised title — Dataxis')
    mounted.rerender(<DocumentTitle productTitle="Dataxis" />)
    expect(document.title).toBe('Dataxis')
    mounted.unmount()
    expect(document.title).toBe('Dataxis')
  })

  it('uses the generic title when the build provides no title', () => {
    vi.stubEnv('DSH_CLIENT_TITLE', '')
    delete process.env.DSH_CLIENT_TITLE
    const mounted = render(<DocumentTitle title="First title" productTitle="DSH Local Build" />)
    expect(document.title).toBe('First title — DSH Local Build')
    mounted.unmount()
    expect(document.title).toBe('DSH Local Build')
  })
})
