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
import sessionDriversList from '../src/drivers_collection.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Session Provider', (group) => {
  group.each.setup(() => {
    return () => {
      sessionDriversList.list = {}
    }
  })

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
            driver: 'cookie',
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

  test('register cookie driver with the driversCollection', async ({ assert }) => {
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
            driver: 'cookie',
          }),
        },
      })
      .create(BASE_URL, {
        importer: IMPORTER,
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.deepEqual(sessionDriversList.list, {})
    assert.instanceOf(await app.container.make(SessionMiddleware), SessionMiddleware)

    assert.property(sessionDriversList.list, 'cookie')
    assert.notProperty(sessionDriversList.list, 'file')
    assert.notProperty(sessionDriversList.list, 'memory')
    assert.notProperty(sessionDriversList.list, 'redis')
  })

  test('register file driver with the driversCollection', async ({ fs, assert }) => {
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
            driver: 'file',
            file: {
              location: fs.basePath,
            },
          }),
        },
      })
      .create(BASE_URL, {
        importer: IMPORTER,
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.deepEqual(sessionDriversList.list, {})
    assert.instanceOf(await app.container.make(SessionMiddleware), SessionMiddleware)

    assert.property(sessionDriversList.list, 'file')
    assert.notProperty(sessionDriversList.list, 'cookie')
    assert.notProperty(sessionDriversList.list, 'memory')
    assert.notProperty(sessionDriversList.list, 'redis')
  })

  test('register redis driver with the driversCollection', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: ['../../providers/session_provider.js', '@adonisjs/redis/redis_provider'],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          session: defineConfig({
            driver: 'redis',
            redis: {
              connection: 'main',
            },
          }),
        },
      })
      .create(BASE_URL, {
        importer: IMPORTER,
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.deepEqual(sessionDriversList.list, {})
    assert.instanceOf(await app.container.make(SessionMiddleware), SessionMiddleware)

    assert.property(sessionDriversList.list, 'redis')
    assert.notProperty(sessionDriversList.list, 'cookie')
    assert.notProperty(sessionDriversList.list, 'memory')
    assert.notProperty(sessionDriversList.list, 'file')
  })

  test('register memory driver with the driversCollection', async ({ assert }) => {
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
            driver: 'memory',
          }),
        },
      })
      .create(BASE_URL, {
        importer: IMPORTER,
      })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.deepEqual(sessionDriversList.list, {})
    assert.instanceOf(await app.container.make(SessionMiddleware), SessionMiddleware)

    assert.property(sessionDriversList.list, 'memory')
    assert.notProperty(sessionDriversList.list, 'cookie')
    assert.notProperty(sessionDriversList.list, 'redis')
    assert.notProperty(sessionDriversList.list, 'file')
  })
})
