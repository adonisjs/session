/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import { Emitter } from '@adonisjs/core/events'
import { AppFactory } from '@adonisjs/core/factories/app'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { type ApplicationService, type EventsList } from '@adonisjs/core/types'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { Session } from '../src/session.ts'
import { CookieStore } from '../src/stores/cookie.ts'
import { httpServer } from '../tests_helpers/index.ts'
import type { SessionConfig, SessionStoreFactory } from '../src/types.ts'

/**
 * Importing session_middleware to trigger macro registration
 */
import '../src/session_middleware.ts'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService
const emitter = new Emitter<EventsList>(app)
const encryption = new EncryptionFactory().create()
const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  cookieName: 'adonis_session',
  cookie: {},
}
const cookieDriver: SessionStoreFactory = (ctx, config) => {
  return new CookieStore(config.cookie, ctx)
}

test.group('Redirect | getPreviousUrl with session', () => {
  test('use session redirect.previousUrl when set', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      session.put('redirect.previousUrl', '/from-session')
      response.redirect().back()
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    assert.include(headers.location, '/from-session')
  })

  test('fall back to referer when session has no previousUrl', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().back()
      response.finish()
    })

    const address = server.listen(0).address() as { port: number }
    const port = address.port
    const { headers } = await supertest(server)
      .get('/')
      .set('referer', `http://127.0.0.1:${port}/from-referer`)
    assert.include(headers.location, '/from-referer')
  })

  test('fall back to fallback URL when neither session nor referer is set', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().back('/fallback')
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    assert.include(headers.location, '/fallback')
  })

  test('consume session previousUrl after reading it', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      session.put('redirect.previousUrl', '/one-time')

      const redirect = response.redirect()
      redirect.getPreviousUrl('/')

      assert.isNull(session.get('redirect.previousUrl', null))
      response.finish()
    })

    await supertest(server).get('/')
  })
})

test.group('Redirect | withIntendedUrl', () => {
  test('store current URL for GET navigational requests', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = { pattern: '/protected', handler: {} } as any

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().withIntendedUrl().toPath('/login')

      assert.equal(session.getIntendedUrl(), ctx.request.url(true))
      response.finish()
    })

    await supertest(server).get('/protected?ref=1')
  })

  test('skip storing for AJAX requests', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = { pattern: '/api/data', handler: {} } as any

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().withIntendedUrl().toPath('/login')

      assert.isNull(session.getIntendedUrl())
      response.finish()
    })

    await supertest(server).get('/api/data').set('X-Requested-With', 'XMLHttpRequest')
  })

  test('skip storing for non-GET requests', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()
      ctx.route = { pattern: '/protected', handler: {} } as any

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().withIntendedUrl().toPath('/login')

      assert.isNull(session.getIntendedUrl())
      response.finish()
    })

    await supertest(server).post('/protected')
  })

  test('skip storing when no route is matched', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().withIntendedUrl().toPath('/login')

      assert.isNull(session.getIntendedUrl())
      response.finish()
    })

    await supertest(server).get('/not-found')
  })
})

test.group('Redirect | toIntended', () => {
  test('redirect to the intended URL from session', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      session.setIntendedUrl('/dashboard')
      response.redirect().toIntended('/home')

      assert.isNull(session.getIntendedUrl())
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    assert.include(headers.location, '/dashboard')
  })

  test('redirect to fallback when no intended URL is stored', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      response.redirect().toIntended('/home')
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    assert.include(headers.location, '/home')
  })

  test('consume the intended URL after redirecting', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, cookieDriver, emitter, ctx)
      await session.initiate(false)
      ctx.session = session

      session.setIntendedUrl('/original')
      response.redirect().toIntended()

      assert.isNull(session.getIntendedUrl())
      response.finish()
    })

    await supertest(server).get('/')
  })
})
