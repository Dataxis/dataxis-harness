// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { AppearanceSettingsStore } from '../src/client/appearance-store.ts'
import type { AppearanceSettings } from '../src/appearance-settings.ts'

describe('AppearanceSettingsStore', () => {
  it('defaults to showing both step kinds', () => {
    const store = new AppearanceSettingsStore()
    expect(store.showToolCalls.getSnapshot()).toBe(true)
    expect(store.showReasoning.getSnapshot()).toBe(true)
  })

  it('writes an explicit change through the scope after publishing it locally', () => {
    const host = stubSettingsScope<AppearanceSettings>()
    const observed: string[] = []
    const scope: typeof host.scope = {
      ...host.scope,
      set: (field, value) => {
        observed.push(`${field}=${String(value)}`)
        return host.scope.set(field, value)
      },
    }
    const store = new AppearanceSettingsStore(scope)
    store.setShowToolCalls(false)
    store.setShowReasoning(false)
    expect(observed).toEqual(['showToolCalls=false', 'showReasoning=false'])
    expect(host.set).toHaveBeenCalledWith('showToolCalls', false)
    expect(host.set).toHaveBeenCalledWith('showReasoning', false)
  })

  it('adopts a Host section without writing it back and leaves an identical write untouched', () => {
    const host = stubSettingsScope<AppearanceSettings>()
    const store = new AppearanceSettingsStore(host.scope)
    host.publish({ status: 'ready', value: { showToolCalls: false, showReasoning: true }, revision: 1, writable: true })
    expect(store.showToolCalls.getSnapshot()).toBe(false)
    expect(store.showReasoning.getSnapshot()).toBe(true)
    store.setShowToolCalls(false)
    expect(host.set).not.toHaveBeenCalled()
  })

  it('adopts a section already standing at construction', () => {
    const host = stubSettingsScope<AppearanceSettings>()
    host.publish({ status: 'ready', value: { showToolCalls: true, showReasoning: false }, revision: 1, writable: true })
    const store = new AppearanceSettingsStore(host.scope)
    expect(store.showReasoning.getSnapshot()).toBe(false)
  })

  it('ignores an unavailable section (keeps defaults) and a no-op write', () => {
    const host = stubSettingsScope<AppearanceSettings>()
    const store = new AppearanceSettingsStore(host.scope)
    host.publish({ status: 'unavailable', value: undefined, revision: 1, writable: false })
    expect(store.showToolCalls.getSnapshot()).toBe(true)
    store.setShowToolCalls(true)
    expect(host.set).not.toHaveBeenCalled()
  })
})
