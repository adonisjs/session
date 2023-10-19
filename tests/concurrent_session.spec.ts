/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import { cuid } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/redis'
import setCookieParser from 'set-cookie-parser'
import { Emitter } from '@adonisjs/core/events'
import { setTimeout } from 'node:timers/promises'
import { EventsList } from '@adonisjs/core/types'
import { AppFactory } from '@adonisjs/core/factories/app'
import { IncomingMessage, ServerResponse } from 'node:http'
import { RedisManagerFactory } from '@adonisjs/redis/factories'
import { CookieClient, HttpContext } from '@adonisjs/core/http'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { Session } from '../src/session.js'
import { FileStore } from '../src/stores/file.js'
import { RedisStore } from '../src/stores/redis.js'
import { httpServer } from '../test_helpers/index.js'
import { CookieStore } from '../src/stores/cookie.js'
import type { SessionConfig, SessionStoreContract } from '../src/types.js'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {})
const emitter = new Emitter<EventsList>(app)
const encryption = new EncryptionFactory().create()
const cookieClient = new CookieClient(encryption)
const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  clearWithBrowser: false,
  cookieName: 'adonis_session',
  cookie: {},
}

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: process.env.REDIS_HOST || '0.0.0.0',
      port: process.env.REDIS_PORT || 6379,
    },
  },
})

const redis = new RedisManagerFactory(redisConfig).create()

/**
 * Re-usable request handler that creates different session scanerios
 * based upon the request URL.
 */
async function requestHandler(
  req: IncomingMessage,
  res: ServerResponse,
  driver: (ctx: HttpContext) => SessionStoreContract
) {
  try {
    const request = new RequestFactory().merge({ req, res, encryption }).create()
    const response = new ResponseFactory().merge({ req, res, encryption }).create()
    const ctx = new HttpContextFactory().merge({ request, response }).create()

    const session = new Session(sessionConfig, driver, emitter, ctx)
    await session.initiate(false)

    if (req.url === '/read-data') {
      await session.commit()

      response.json(session.all())
      return response.finish()
    }

    if (req.url === '/read-data-slowly') {
      await setTimeout(2000)
      await session.commit()

      response.json(session.all())
      return response.finish()
    }

    if (req.url === '/write-data') {
      session.put('username', 'virk')
      await session.commit()

      response.json(session.all())
      return response.finish()
    }

    if (req.url === '/write-data-slowly') {
      await setTimeout(2000)

      session.put('email', 'foo@bar.com')
      await session.commit()

      response.json(session.all())
      return response.finish()
    }
  } catch (error) {
    res.writeHead(500)
    res.write(error.stack)
    res.end()
  }
}

test.group('Concurrency | cookie driver', () => {
  test('concurrently read and read slowly', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create((req, res) =>
      requestHandler(req, res, (ctx) => new CookieStore(sessionConfig.cookie, ctx))
    )

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const responses = await Promise.all([
      supertest(server)
        .get('/read-data')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),

      supertest(server)
        .get('/read-data-slowly')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),
    ])

    /**
     * Asserting store data when using cookie driver
     */
    const cookies = setCookieParser.parse(responses[0].headers['set-cookie'], { map: true })
    const cookies1 = setCookieParser.parse(responses[1].headers['set-cookie'], { map: true })
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      age: 22,
    })
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies1[sessionId!].value), {
      age: 22,
    })
  }).timeout(6000)

  test('HAS RACE CONDITION: concurrently write and read slowly', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create((req, res) =>
      requestHandler(req, res, (ctx) => new CookieStore(sessionConfig.cookie, ctx))
    )

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const responses = await Promise.all([
      supertest(server)
        .get('/read-data-slowly')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),

      supertest(server)
        .get('/write-data')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),
    ])

    const cookies = setCookieParser.parse(responses[0].headers['set-cookie'], { map: true })
    const cookies1 = setCookieParser.parse(responses[1].headers['set-cookie'], { map: true })

    /**
     * Since this request finishes afterwards, it will overwrite the mutations
     * from the /write-data endpoint. THIS IS A CONCURRENCY CONCERN
     */
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      age: 22,
    })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies1[sessionId!].value), {
      age: 22,
      username: 'virk',
    })
  }).timeout(6000)

  test('HAS RACE CONDITION: concurrently write and write slowly', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create((req, res) =>
      requestHandler(req, res, (ctx) => new CookieStore(sessionConfig.cookie, ctx))
    )

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const responses = await Promise.all([
      supertest(server)
        .get('/write-data-slowly')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),

      supertest(server)
        .get('/write-data')
        .set('Cookie', `${sessionIdCookie}; ${sessionStoreCookie}`),
    ])

    const cookies = setCookieParser.parse(responses[0].headers['set-cookie'], { map: true })
    const cookies1 = setCookieParser.parse(responses[1].headers['set-cookie'], { map: true })

    /**
     * Since this request finishes afterwards, it will overwrite the mutations
     * from the /write-data endpoint. THIS IS A CONCURRENCY CONCERN
     */
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      age: 22,
      email: 'foo@bar.com',
    })

    /**
     * Same applies here. In short two concurrent write requests will mess up
     * all the time
     */
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies1[sessionId!].value), {
      age: 22,
      username: 'virk',
    })
  }).timeout(6000)
})

test.group('Concurrency | file driver', () => {
  test('concurrently read and read slowly', async ({ fs, assert }) => {
    let sessionId = cuid()

    const fileDriver = new FileStore({ location: fs.basePath }, sessionConfig.age)
    await fileDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => fileDriver))

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    await Promise.all([
      supertest(server).get('/read-data').set('Cookie', `${sessionIdCookie};`),
      supertest(server).get('/read-data-slowly').set('Cookie', `${sessionIdCookie};`),
    ])

    /**
     * Asserting store data when using file driver
     */
    await assert.fileEquals(
      `${sessionId}.txt`,
      JSON.stringify({
        message: { age: 22 },
        purpose: sessionId,
      })
    )
  }).timeout(6000)

  test('concurrently write and read slowly', async ({ fs, assert }) => {
    let sessionId = cuid()

    const fileDriver = new FileStore({ location: fs.basePath }, sessionConfig.age)
    await fileDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => fileDriver))
    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    await Promise.all([
      supertest(server).get('/read-data-slowly').set('Cookie', `${sessionIdCookie}`),
      supertest(server).get('/write-data').set('Cookie', `${sessionIdCookie}`),
    ])

    await assert.fileEquals(
      `${sessionId}.txt`,
      JSON.stringify({
        message: { age: 22, username: 'virk' },
        purpose: sessionId,
      })
    )
  }).timeout(6000)

  test('HAS RACE CONDITON: concurrently write and write slowly', async ({ fs, assert }) => {
    let sessionId = cuid()

    const fileDriver = new FileStore({ location: fs.basePath }, sessionConfig.age)
    await fileDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => fileDriver))

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    await Promise.all([
      supertest(server).get('/write-data-slowly').set('Cookie', `${sessionIdCookie}`),
      supertest(server).get('/write-data').set('Cookie', `${sessionIdCookie}`),
    ])

    await assert.fileEquals(
      `${sessionId}.txt`,
      JSON.stringify({
        message: { age: 22, email: 'foo@bar.com' },
        purpose: sessionId,
      })
    )
  }).timeout(6000)
})

test.group('Concurrency | redis driver', (group) => {
  group.tap((t) => {
    t.skip(!!process.env.NO_REDIS, 'Redis not available in windows env')
  })

  test('concurrently read and read slowly', async ({ assert, cleanup }) => {
    let sessionId = cuid()
    cleanup(async () => {
      await redisDriver.destroy(sessionId)
    })

    const redisDriver = new RedisStore(redis.connection('main'), sessionConfig.age)
    await redisDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => redisDriver))

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    await Promise.all([
      supertest(server).get('/read-data').set('Cookie', `${sessionIdCookie};`),
      supertest(server).get('/read-data-slowly').set('Cookie', `${sessionIdCookie};`),
    ])

    /**
     * Asserting store data when using file driver
     */
    assert.deepEqual(await redisDriver.read(sessionId), {
      age: 22,
    })
  }).timeout(6000)

  test('concurrently write and read slowly', async ({ assert, cleanup }) => {
    let sessionId = cuid()
    cleanup(async () => {
      await redisDriver.destroy(sessionId)
    })

    const redisDriver = new RedisStore(redis.connection('main'), sessionConfig.age)
    await redisDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => redisDriver))
    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    await Promise.all([
      supertest(server).get('/read-data-slowly').set('Cookie', `${sessionIdCookie}`),
      supertest(server).get('/write-data').set('Cookie', `${sessionIdCookie}`),
    ])

    assert.deepEqual(await redisDriver.read(sessionId), { age: 22, username: 'virk' })
  }).timeout(6000)

  test('HAS RACE CONDITON: concurrently write and write slowly', async ({ assert, cleanup }) => {
    let sessionId = cuid()
    cleanup(async () => {
      await redisDriver.destroy(sessionId)
    })

    const redisDriver = new RedisStore(redis.connection('main'), sessionConfig.age)
    await redisDriver.write(sessionId, { age: 22 })

    const server = httpServer.create((req, res) => requestHandler(req, res, () => redisDriver))

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    await Promise.all([
      supertest(server).get('/write-data-slowly').set('Cookie', `${sessionIdCookie}`),
      supertest(server).get('/write-data').set('Cookie', `${sessionIdCookie}`),
    ])

    assert.deepEqual(await redisDriver.read(sessionId), { age: 22, email: 'foo@bar.com' })
  }).timeout(6000)
})
