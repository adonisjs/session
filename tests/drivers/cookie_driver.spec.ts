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
import setCookieParser from 'set-cookie-parser'
import { CookieClient } from '@adonisjs/core/http'
import type { CookieOptions } from '@adonisjs/core/types/http'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { httpServer } from '../../test_helpers/index.js'
import { CookieDriver } from '../../src/drivers/cookie.js'

const encryption = new EncryptionFactory().create()
const cookieClient = new CookieClient(encryption)
const cookieConfig: Partial<CookieOptions> = {
  sameSite: 'strict',
  maxAge: '5mins',
}

test.group('Cookie driver', () => {
  test('return null when session data cookie does not exists', async ({ assert }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      const value = session.read(sessionId)
      response.json(value)
      response.finish()
    })

    const { body, text } = await supertest(server).get('/')
    assert.deepEqual(body, {})
    assert.equal(text, '')
  })

  test('return session data from the cookie', async ({ assert }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      const value = session.read(sessionId)
      response.json(value)
      response.finish()
    })

    const { body } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionId}=${cookieClient.encrypt(sessionId, { visits: 1 })}`)

    assert.deepEqual(body, { visits: 1 })
  })

  test('persist session data inside a cookie', async ({ assert }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      session.write(sessionId, { visits: 0 })
      response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookieClient.decrypt(sessionId, cookies[sessionId].value), {
      visits: 0,
    })
  })

  test('touch cookie by re-updating its attributes', async ({ assert }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      session.touch(sessionId)
      response.finish()
    })

    const { headers } = await supertest(server)
      .get('/')
      .set('Cookie', `${sessionId}=${cookieClient.encrypt(sessionId, { visits: 1 })}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookieClient.decrypt(sessionId, cookies[sessionId].value), {
      visits: 1,
    })
  })

  test('do not write cookie to response unless touch or write methods are called', async ({
    assert,
  }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      response.json(session.read(sessionId))
      response.finish()
    })

    const { headers, body } = await supertest(server)
      .get('/')
      .set('Cookie', `${sessionId}=${cookieClient.encrypt(sessionId, { visits: 1 })}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.deepEqual(cookies, {})
    assert.deepEqual(body, { visits: 1 })
  })

  test('delete session data cookie', async ({ assert }) => {
    const sessionId = '1234'

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new CookieDriver(cookieConfig, ctx)
      response.json(session.read(sessionId))
      session.destroy(sessionId)
      response.finish()
    })

    const { headers, body } = await supertest(server)
      .get('/')
      .set('Cookie', `${sessionId}=${cookieClient.encrypt(sessionId, { visits: 1 })}`)

    const cookies = setCookieParser.parse(headers['set-cookie'], { map: true })
    assert.equal(cookies[sessionId].maxAge, -1)
    assert.equal(cookies[sessionId].expires, new Date('1970-01-01').toString())
    assert.deepEqual(body, { visits: 1 })
  })
})
