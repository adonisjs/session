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
import setCookieParser from 'set-cookie-parser'
import { CookieClient } from '@adonisjs/core/http'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { httpServer } from '../test_helpers/index.js'
import { CookieStore } from '../src/stores/cookie.js'
import type { SessionConfig } from '../src/types.js'
import { SessionMiddlewareFactory } from '../factories/session_middleware_factory.js'

const encryption = new EncryptionFactory().create()
const cookieClient = new CookieClient(encryption)
const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  clearWithBrowser: false,
  cookieName: 'adonis_session',
  cookie: {},
}

test.group('Session middleware', () => {
  test('initiate and commit session around request', async ({ assert }) => {
    let sessionId: string | undefined

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = await new SessionMiddlewareFactory()
        .merge({
          config: Object.assign(
            {
              store: 'cookie',
              stores: {
                cookie: () => new CookieStore(sessionConfig.cookie, ctx),
              },
            },
            sessionConfig
          ),
        })
        .create()

      await middleware.handle(ctx, () => {
        sessionId = ctx.session.sessionId
        ctx.session.put('username', 'virk')
        ctx.session.flash({ status: 'Completed' })
      })

      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookieClient.decrypt(sessionId!, cookies[sessionId!].value), {
      username: 'virk',
      __flash__: {
        status: 'Completed',
      },
    })
  })

  test('do not initiate session when not enabled', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const middleware = await new SessionMiddlewareFactory()
        .merge({
          config: Object.assign(
            {
              store: 'cookie',
              stores: {
                cookie: () => new CookieStore(sessionConfig.cookie, ctx),
              },
            },
            sessionConfig,
            {
              enabled: false,
            }
          ),
        })
        .create()

      await middleware.handle(ctx, () => {})
      assert.isUndefined(ctx.session)
      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookies, {})
  })
})
