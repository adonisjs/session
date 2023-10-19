/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'

import { defineConfig } from '../index.js'
import SessionMiddleware from '../src/session_middleware.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Session Provider', () => {
  test('register session provider', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: ['../../providers/session_provider.js'],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          session: defineConfig({
            store: 'memory',
            stores: {},
          }),
        },
      })
      .create(BASE_URL, {
        importer: IMPORTER,
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.instanceOf(await app.container.make(SessionMiddleware), SessionMiddleware)
  })
})
