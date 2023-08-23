/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import edge from 'edge.js'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { cuid } from '@adonisjs/core/helpers'
import setCookieParser from 'set-cookie-parser'
import { Emitter } from '@adonisjs/core/events'
import { SimpleErrorReporter } from '@vinejs/vine'
import { CookieClient } from '@adonisjs/core/http'
import { fieldContext } from '@vinejs/vine/factories'
import { AppFactory } from '@adonisjs/core/factories/app'
import { ApplicationService, EventsList } from '@adonisjs/core/types'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import EdgeServiceProvider from '@adonisjs/core/providers/edge_provider'
import {
  RouterFactory,
  RequestFactory,
  ResponseFactory,
  HttpContextFactory,
} from '@adonisjs/core/factories/http'

import { Session } from '../src/session.js'
import { httpServer } from '../test_helpers/index.js'
import { CookieDriver } from '../src/drivers/cookie.js'
import type { SessionConfig } from '../src/types/main.js'
import SessionProvider from '../providers/session_provider.js'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService
const emitter = new Emitter<EventsList>(app)
const encryption = new EncryptionFactory().create()
const cookieClient = new CookieClient(encryption)
const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  clearWithBrowser: false,
  cookieName: 'adonis_session',
  driver: 'cookie',
  cookie: {},
}

test.group('Session', (group) => {
  group.setup(async () => {
    const router = new RouterFactory().create()
    await app.init()

    app.container.singleton('router', () => router)

    await new EdgeServiceProvider(app).boot()
    await new SessionProvider(app).boot()
  })

  test('do not define session id cookie when not initiated', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)

      assert.isFalse(session.initiated)

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookies, {})
  })

  test("initiate session with fresh session id when there isn't any session", async ({
    assert,
  }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
  })

  test('do not commit to store when session store is empty', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
    assert.lengthOf(Object.keys(cookies), 1)
  })

  test('commit to store when session has data', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.put('username', 'virk')
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.property(cookies, sessionId!)
    assert.equal(cookies[sessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      username: 'virk',
    })
  })

  test('append to existing store', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.put('username', 'virk')
      assert.isTrue(session.has('username'))
      assert.isTrue(session.has('age'))
      assert.deepEqual(session.all(), { username: 'virk', age: 22 })

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.property(cookies, sessionId!)
    assert.equal(cookies[sessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      username: 'virk',
      age: 22,
    })
  })

  test('delete store when session store is empty', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.forget('age')
      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.equal(cookies[sessionId].maxAge, -1)
    assert.lengthOf(Object.keys(cookies), 2)
  })

  test('pull value from the session store', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      assert.equal(session.pull('age'), 22)
      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.equal(cookies[sessionId].maxAge, -1)
    assert.lengthOf(Object.keys(cookies), 2)
  })

  test('initiate value with 1 on increment', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.increment('visits')
      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    const { headers } = await supertest(server).get('/').set('cookie', `${sessionIdCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      visits: 1,
    })
  })

  test('initiate value with -1 on decrement', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.decrement('visits')
      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`

    const { headers } = await supertest(server).get('/').set('cookie', `${sessionIdCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      visits: -1,
    })
  })

  test('touch session store when not modified', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.property(cookies, sessionId!)
    assert.equal(cookies[sessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      age: 22,
    })
  })

  test('clear session store', async ({ assert }) => {
    let sessionId = cuid()

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.clear()
      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.equal(cookies[sessionId].maxAge, -1)
    assert.lengthOf(Object.keys(cookies), 2)
  })

  test('throw error when trying to read from uninitiated store', async () => {
    const ctx = new HttpContextFactory().create()
    const driver = new CookieDriver(sessionConfig.cookie, ctx)
    const session = new Session(sessionConfig, driver, emitter, ctx)
    session.get('username')
  }).throws(
    'Session store has not been initiated. Make sure you have registered the session middleware'
  )

  test('throw error when trying to write to a read only store', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()
    const driver = new CookieDriver(sessionConfig.cookie, ctx)
    const session = new Session(sessionConfig, driver, emitter, ctx)

    await session.initiate(true)
    assert.isUndefined(session.get('username'))

    session.put('username', 'foo')
  }).throws('Session store is in readonly mode and cannot be mutated')

  test('share session data with templates', async ({ assert }) => {
    let sessionId = cuid()

    edge.registerTemplate('welcome', {
      template: `The user age is {{ session.get('age') }}`,
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      try {
        response.send(await ctx.view.render('welcome'))
      } catch (error) {
        console.log(error)
      }

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { text } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    assert.equal(text, 'The user age is 22')
  })
})

test.group('Session | Regenerate', () => {
  test("initiate session with fresh session id when there isn't any session", async ({
    assert,
  }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.regenerate()

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)
      assert.isFalse(session.hasRegeneratedSession)

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
  })

  test('do not commit to store when session store is empty', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.regenerate()

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)
      assert.isFalse(session.hasRegeneratedSession)

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.property(cookies, 'adonis_session')
    assert.lengthOf(Object.keys(cookies), 1)
  })

  test('commit to store when session has data', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.regenerate()
      assert.isFalse(session.hasRegeneratedSession)

      session.put('username', 'virk')
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.property(cookies, sessionId!)
    assert.equal(cookies[sessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      username: 'virk',
    })
  })

  test('append to existing store', async ({ assert }) => {
    let sessionId = cuid()
    let newSessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.put('username', 'virk')
      session.regenerate()
      newSessionId = session.sessionId

      assert.isTrue(session.hasRegeneratedSession)

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.notEqual(newSessionId, sessionId)
    assert.property(cookies, newSessionId!)
    assert.equal(cookies[sessionId!].maxAge, -1)
    assert.equal(cookies[newSessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(newSessionId!, cookies[newSessionId!].value), {
      username: 'virk',
      age: 22,
    })
  })

  test('delete store when session store is empty', async ({ assert }) => {
    let sessionId = cuid()
    let newSessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.forget('age')
      session.regenerate()
      newSessionId = session.sessionId

      assert.isTrue(session.hasRegeneratedSession)

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.notEqual(newSessionId, sessionId)
    assert.property(cookies, 'adonis_session')
    assert.notProperty(cookies, newSessionId!)
    assert.equal(cookies[sessionId].maxAge, -1)
    assert.lengthOf(Object.keys(cookies), 2)
  })

  test('touch session store when not modified', async ({ assert }) => {
    let sessionId = cuid()
    let newSessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      session.regenerate()
      newSessionId = session.sessionId

      assert.isTrue(session.hasRegeneratedSession)

      await session.commit()
      response.finish()
    })

    const sessionIdCookie = `adonis_session=${cookieClient.sign('adonis_session', sessionId)}`
    const sessionStoreCookie = `${sessionId}=${cookieClient.encrypt(sessionId, { age: 22 })}`

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionIdCookie}; ${sessionStoreCookie}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.property(cookies, 'adonis_session')
    assert.property(cookies, sessionId!)
    assert.equal(cookies[sessionId!].maxAge, -1)
    assert.property(cookies, newSessionId!)
    assert.equal(cookies[newSessionId!].maxAge, 90)
    assert.deepEqual(cookieClient.decrypt(newSessionId!, cookies[newSessionId!].value), {
      age: 22,
    })
  })
})

test.group('Session | Flash', () => {
  test('flash data using the session store', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.flash('status', 'Task created successfully')
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      __flash__: {
        status: 'Task created successfully',
      },
    })
  })

  test('flash key-value pair', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.flash({ status: 'Task created successfully' })
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      __flash__: {
        status: 'Task created successfully',
      },
    })
  })

  test('flash input values', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.request.setInitialBody({
        username: 'virk',
      })

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.flash({ status: 'Task created successfully' })
      session.flashAll()
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      __flash__: {
        username: 'virk',
        status: 'Task created successfully',
      },
    })
  })

  test('flash selected input values', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.request.setInitialBody({
        username: 'virk',
        age: 22,
      })

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      session.flash({ status: 'Task created successfully' })

      /**
       * The last method call will overwrite others
       */
      session.flashAll()
      session.flashExcept(['username'])
      session.flashOnly(['username'])

      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      __flash__: {
        username: 'virk',
        status: 'Task created successfully',
      },
    })
  })

  test('read flash messages from the request', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.json(session.flashMessages.all())
        await session.commit()
        response.finish()
      } else {
        session.flash({ status: 'Task created successfully' })
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { body, headers: newHeaders } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )

    const newCookies = setCookieParser.parse(newHeaders['set-cookie'], { map: true })

    assert.deepEqual(body, { status: 'Task created successfully' })
    assert.equal(newCookies[sessionId!].maxAge, -1)
  })

  test('reflash flash messages', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.json(session.flashMessages.all())
        await session.commit()
        response.finish()
      } else if (request.url() === '/reflash') {
        session.reflash()
        await session.commit()
      } else {
        session.flash({ status: 'Task created successfully' })
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { headers: reflashedHeaders } = await supertest(server)
      .get('/reflash')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )
    const reflashedCookies = setCookieParser.parse(reflashedHeaders['set-cookie'], { map: true })

    const { body, headers: newHeaders } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${reflashedCookies.adonis_session.value}; ${sessionId}=${
          reflashedCookies[sessionId!].value
        }`
      )

    const newCookies = setCookieParser.parse(newHeaders['set-cookie'], { map: true })

    assert.deepEqual(body, { status: 'Task created successfully' })
    assert.equal(newCookies[sessionId!].maxAge, -1)
  })

  test('reflash and flash together', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.json(session.flashMessages.all())
        await session.commit()
        response.finish()
      } else if (request.url() === '/reflash') {
        session.reflash()
        session.reflashExcept(['id'])
        session.reflashOnly(['id'])
        session.flash({ state: 'success' })
        await session.commit()
      } else {
        session.flash({ status: 'Task created successfully', id: 1 })
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { headers: reflashedHeaders } = await supertest(server)
      .get('/reflash')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )
    const reflashedCookies = setCookieParser.parse(reflashedHeaders['set-cookie'], { map: true })

    const { body, headers: newHeaders } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${reflashedCookies.adonis_session.value}; ${sessionId}=${
          reflashedCookies[sessionId!].value
        }`
      )

    const newCookies = setCookieParser.parse(newHeaders['set-cookie'], { map: true })

    assert.deepEqual(body, { id: 1, state: 'success' })
    assert.equal(newCookies[sessionId!].maxAge, -1)
  })

  test('throw error when trying to write to flash messages without initialization', async () => {
    const ctx = new HttpContextFactory().create()
    const driver = new CookieDriver(sessionConfig.cookie, ctx)
    const session = new Session(sessionConfig, driver, emitter, ctx)
    session.flash('username', 'virk')
  }).throws(
    'Session store has not been initiated. Make sure you have registered the session middleware'
  )

  test('throw error when trying to write flash messages to a read only store', async () => {
    const ctx = new HttpContextFactory().create()
    const driver = new CookieDriver(sessionConfig.cookie, ctx)
    const session = new Session(sessionConfig, driver, emitter, ctx)

    await session.initiate(true)
    session.flash('username', 'foo')
  }).throws('Session store is in readonly mode and cannot be mutated')

  test('flash validation error messages', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)

      const errorReporter = new SimpleErrorReporter()
      errorReporter.report('Invalid username', 'alpha', fieldContext.create('username', ''), {})
      errorReporter.report(
        'Username is required',
        'required',
        fieldContext.create('username', ''),
        {}
      )
      errorReporter.report('Invalid email', 'email', fieldContext.create('email', ''), {})

      session.flashValidationErrors(errorReporter.createError())
      sessionId = session.sessionId

      await session.commit()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      __flash__: {
        errors: {
          email: ['Invalid email'],
          username: ['Invalid username', 'Username is required'],
        },
      },
    })
  })

  test('access flash messages inside templates', async ({ assert }) => {
    let sessionId: string | undefined

    edge.registerTemplate('flash_messages', {
      template: `{{ old('status') }}`,
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.send(await ctx.view.render('flash_messages'))
        await session.commit()
        response.finish()
      } else {
        session.flash({ status: 'Task created successfully' })
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { text } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )

    assert.equal(text, 'Task created successfully')
  })

  test('access flash messages using the @flashMessage tag', async ({ assert }) => {
    let sessionId: string | undefined

    edge.registerTemplate('flash_messages_via_tag', {
      template: `@flashMessage('status')
        <p> {{ message }} </p>
      @end
      @flashMessage('success')
        <p> {{ message }} </p>
      @else
        <p> No success message </p>
      @end
      `,
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.send(await ctx.view.render('flash_messages_via_tag'))
        await session.commit()
        response.finish()
      } else {
        session.flash({ status: 'Task created successfully' })
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { text } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )

    assert.deepEqual(
      text.split('\n').map((line) => line.trim()),
      ['<p> Task created successfully </p>', '<p> No success message </p>', '']
    )
  })

  test('access flash error messages using the @error tag', async ({ assert }) => {
    let sessionId: string | undefined

    edge.registerTemplate('flash_errors_messages', {
      template: `
      @error('username')
        @each(message in messages)
          <p> {{ message }} </p>
        @end
      @else
        <p> No error message </p>
      @end
      `,
    })

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const driver = new CookieDriver(sessionConfig.cookie, ctx)
      const session = new Session(sessionConfig, driver, emitter, ctx)
      await session.initiate(false)
      sessionId = session.sessionId

      if (request.url() === '/prg') {
        response.send(await ctx.view.render('flash_errors_messages'))
        await session.commit()
        response.finish()
      } else {
        const errorReporter = new SimpleErrorReporter()
        errorReporter.report('Invalid username', 'alpha', fieldContext.create('username', ''), {})
        errorReporter.report(
          'Username is required',
          'required',
          fieldContext.create('username', ''),
          {}
        )

        session.flashValidationErrors(errorReporter.createError())
        await session.commit()
      }

      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })

    const { text } = await supertest(server)
      .get('/prg')
      .set(
        'Cookie',
        `adonis_session=${cookies.adonis_session.value}; ${sessionId}=${cookies[sessionId!].value}`
      )

    assert.deepEqual(
      text.split('\n').map((line) => line.trim()),
      ['', '<p> Invalid username </p>', '<p> Username is required </p>', '']
    )
  })
})
