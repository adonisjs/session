/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { AppFactory } from '@adonisjs/core/factories/app'
import { defineConfig as redisConfig } from '@adonisjs/redis'
import type { ApplicationService } from '@adonisjs/core/types'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { FileStore } from '../src/stores/file.js'
import { RedisStore } from '../src/stores/redis.js'
import { CookieStore } from '../src/stores/cookie.js'
import { defineConfig, stores } from '../src/define_config.js'

const BASE_URL = new URL('./', import.meta.url)
const app = new AppFactory().create(BASE_URL, () => {}) as ApplicationService

test.group('Define config', () => {
  test('throw error when store is not defined', async () => {
    await defineConfig({} as any).resolver(app)
  }).throws('Missing "store" property inside the session config')

  test('define maxAge when clearWithBrowser is not defined', async ({ assert }) => {
    const config = await defineConfig({ store: 'memory', stores: {} }).resolver(app)
    assert.equal(config.cookie.maxAge, 7200)
  })

  test('define maxAge when clearWithBrowser is not enabled', async ({ assert }) => {
    const config = await defineConfig({
      clearWithBrowser: false,
      store: 'memory',
      stores: {},
    }).resolver(app)
    assert.equal(config.cookie.maxAge, 7200)
  })

  test('define maxAge when clearWithBrowser is enabled', async ({ assert }) => {
    const config = await defineConfig({
      clearWithBrowser: true,
      store: 'memory',
      stores: {},
    }).resolver(app)

    assert.isUndefined(config.cookie.maxAge)
  })

  test('transform config with no stores', async ({ assert }) => {
    const config = await defineConfig({ store: 'memory', stores: {} }).resolver(app)
    assert.snapshot(config).matchInline(`
      {
        "age": "2h",
        "clearWithBrowser": false,
        "cookie": {
          "maxAge": 7200,
        },
        "cookieName": "adonis_session",
        "enabled": true,
        "store": "memory",
        "stores": {
          "memory": [Function],
        },
      }
    `)
  })

  test('transform config with file store', async ({ assert }) => {
    const config = await defineConfig({
      store: 'file',
      stores: {
        file: stores.file({ location: fileURLToPath(new URL('./sessions', BASE_URL)) }),
      },
    }).resolver(app)

    assert.snapshot(config).matchInline(`
      {
        "age": "2h",
        "clearWithBrowser": false,
        "cookie": {
          "maxAge": 7200,
        },
        "cookieName": "adonis_session",
        "enabled": true,
        "store": "file",
        "stores": {
          "file": [Function],
          "memory": [Function],
        },
      }
    `)

    const ctx = new HttpContextFactory().create()
    assert.instanceOf(config.stores.file(ctx, config), FileStore)
  })

  test('transform config with redis store', async ({ assert }) => {
    const appForRedis = new AppFactory().create(BASE_URL, () => {}) as ApplicationService
    appForRedis.rcContents({
      providers: [
        () => import('@adonisjs/core/providers/app_provider'),
        () => import('@adonisjs/redis/redis_provider'),
      ],
    })
    appForRedis.useConfig({
      logger: {
        default: 'main',
        loggers: {
          main: {},
        },
      },
      redis: redisConfig({
        connection: 'main',
        connections: {
          main: {},
        },
      }),
    })
    await appForRedis.init()
    await appForRedis.boot()

    const config = await defineConfig({
      store: 'redis',
      stores: {
        redis: stores.redis({
          connection: 'main',
        } as any),
      },
    }).resolver(appForRedis)

    assert.snapshot(config).matchInline(`
      {
        "age": "2h",
        "clearWithBrowser": false,
        "cookie": {
          "maxAge": 7200,
        },
        "cookieName": "adonis_session",
        "enabled": true,
        "store": "redis",
        "stores": {
          "memory": [Function],
          "redis": [Function],
        },
      }
    `)

    const ctx = new HttpContextFactory().create()
    assert.instanceOf(config.stores.redis(ctx, config), RedisStore)
  })

  test('transform config with cookie store', async ({ assert }) => {
    const config = await defineConfig({
      store: 'cookie',
      stores: {
        cookie: stores.cookie(),
      },
    }).resolver(app)

    assert.snapshot(config).matchInline(`
      {
        "age": "2h",
        "clearWithBrowser": false,
        "cookie": {
          "maxAge": 7200,
        },
        "cookieName": "adonis_session",
        "enabled": true,
        "store": "cookie",
        "stores": {
          "cookie": [Function],
          "memory": [Function],
        },
      }
    `)

    const ctx = new HttpContextFactory().create()
    assert.instanceOf(config.stores.cookie(ctx, config), CookieStore)
  })
})
