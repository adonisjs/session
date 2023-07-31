/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { defineConfig } from '../src/define_config.js'

test.group('Define config', () => {
  test('throw error when driver is not defined', () => {
    defineConfig({})
  }).throws('Missing "driver" property inside the session config')

  test('define maxAge when clearWithBrowser is not enabled', ({ assert }) => {
    assert.equal(defineConfig({ driver: 'cookie' }).cookie.maxAge, 7200)
    assert.equal(defineConfig({ driver: 'cookie', clearWithBrowser: false }).cookie.maxAge, 7200)
  })

  test('do not define maxAge when clearWithBrowser is true', ({ assert }) => {
    assert.isUndefined(defineConfig({ driver: 'cookie', clearWithBrowser: true }).cookie.maxAge)
  })

  test('normalize config', ({ assert }) => {
    assert.snapshot(defineConfig({ driver: 'cookie' })).matchInline(`
      {
        "age": "2h",
        "clearWithBrowser": false,
        "cookie": {
          "maxAge": 7200,
        },
        "cookieName": "adonis_session",
        "driver": "cookie",
        "enabled": true,
      }
    `)
  })
})
