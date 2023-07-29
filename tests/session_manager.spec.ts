/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import supertest from 'supertest'
import { createServer } from 'node:http'
import { MessageBuilder } from '@poppinss/utils'
import setCookieParser from 'set-cookie-parser'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { Store } from '../src/store.js'
import {
  setup,
  sessionConfig,
  unsignCookie,
  getRedisManager,
  createHttpContext,
} from '../test_helpers/index.js'
import { SessionManagerFactory } from '../factories/session_manager_factory.js'
import { SessionDriverContract } from '../src/types.js'

test.group('Session Manager', () => {
  test('do not set maxAge when clearWithBrowser is true', async ({ assert, fs }) => {
    const { app } = await setup(fs)
    const config = Object.assign({}, sessionConfig, { clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    assert.lengthOf(header['set-cookie'][0].split(';'), 3)
  })

  test('set maxAge when clearWithBrowser is false', async ({ assert, fs }) => {
    const { app } = await setup(fs)
    const manager = new SessionManagerFactory().create(app)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(header['set-cookie'][0])

    assert.isDefined(cookies[0].maxAge)
    assert.equal(cookies[0].maxAge, sessionConfig.age)
  })

  test('use file driver to persist session value', async ({ assert, fs }) => {
    const { app } = await setup(fs)
    const config = Object.assign({}, sessionConfig, {
      driver: 'file',
      file: { location: fs.basePath },
    })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    const sessionContents = await fs.contents(`${sessionId}.txt`)
    const sessionValues = new MessageBuilder().verify<any>(sessionContents, sessionId)
    assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })
  })

  test('use redis driver to persist session value', async ({ assert, fs }) => {
    const { app } = await setup(fs)
    const config = Object.assign({}, sessionConfig, {
      driver: 'redis',
      redisConnection: 'session',
    })

    const redis = getRedisManager(app)
    const manager = new SessionManagerFactory()
      .merge(config)
      .mergeRedisManagerOptions({
        connection: 'session',
        connections: { session: { host: 'localhost', port: 6379 } },
      })
      .create(app)

    // @ts-ignore
    app.container.singleton('redis', () => redis)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)

    const sessionContents = await redis.connection('session').get(sessionId)
    const sessionValues = new MessageBuilder().verify<any>(sessionContents, sessionId)

    await redis.connection('session').del(sessionId)
    await redis.disconnectAll()

    assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })
  })

  test('extend by adding a custom driver', async ({ assert, fs }) => {
    assert.plan(1)

    const { app } = await setup(fs, {
      session: {
        driver: 'mongo',
      },
    })

    class MongoDriver implements SessionDriverContract {
      read() {
        return {}
      }
      write(_: string, data: any) {
        assert.deepEqual(data, { name: 'virk' })
      }
      touch() {}
      destroy() {}
    }

    const sessionManager = await app.container.make('session')
    sessionManager.extend('mongo', () => new MongoDriver())
    const session = sessionManager.create(new HttpContextFactory().create())

    await session.initiate(false)
    session.put('name', 'virk')
    await session.commit()
  })
})
