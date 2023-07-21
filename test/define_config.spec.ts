import { test } from '@japa/runner'
import { defineConfig } from '../src/define_config.js'

test.group('Define config', () => {
  test('should throws if no driver defined', ({ assert }) => {
    assert.throws(
      () => defineConfig({ cookieName: 'hey' } as any),
      'Missing "driver" property inside the session config'
    )
  })

  test('should throws if no cookieName defined', ({ assert }) => {
    assert.throws(
      () => defineConfig({ driver: 'cookie' } as any),
      'Missing "cookieName" property inside the session config'
    )
  })
})
