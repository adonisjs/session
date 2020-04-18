/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/session.ts" />

import test from 'japa'
import supertest from 'supertest'
import { createServer } from 'http'
import { SessionConfig } from '@ioc:Adonis/Addons/Session'

import { CookieDriver } from '../src/Drivers/Cookie'
import { createCtx, encryption } from '../test-helpers'

const config: SessionConfig = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

test.group('Cookie driver', () => {
  test('return null object when cookie is missing', async (assert) => {
    assert.plan(1)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const session = new CookieDriver(config, createCtx(req, res, {}))
      const value = session.read(sessionId)
      assert.isNull(value)
      res.end()
    })

    await supertest(server).get('/')
  })

  test('return empty object when cookie value is invalid', async (assert) => {
    assert.plan(1)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const session = new CookieDriver(config, createCtx(req, res, {}))
      const value = session.read(sessionId)
      assert.isNull(value)
      res.end()
    })

    await supertest(server)
      .get('/')
      .set('cookie', '1234=hello-world')
  })

  test('return cookie values as an object', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const session = new CookieDriver(config, ctx)
      const value = session.read(sessionId)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(value))
      res.end()
    })

    const message = encryption.encrypt({ message: 'hello-world' }, undefined, sessionId)
    const { body } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionId}=e:${message}`)

    assert.deepEqual(body, { message: 'hello-world' })
  })

  test('write cookie value', async (assert) => {
    const sessionId = '1234'

    const server = createServer((req, res) => {
      const ctx = createCtx(req, res, {})

      const session = new CookieDriver(config, ctx)
      session.write(sessionId, { message: 'hello-world' })
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
      .replace(`${sessionId}=`, '')
      .slice(2)

    assert.deepEqual(encryption.decrypt(cookieValue, sessionId), { message: 'hello-world' })
  })

  test('update cookie with existing value', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const session = new CookieDriver(config, ctx)
      session.touch(sessionId)
      ctx.response.send('')
      ctx.response.finish()
    })

    const message = encryption.encrypt({ message: 'hello-world' }, undefined, sessionId)
    const { header } = await supertest(server)
      .get('/')
      .set('cookie', `${sessionId}=e:${message}`)

    const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
      .replace(`${sessionId}=`, '')
      .slice(2)

    assert.deepEqual(encryption.decrypt(cookieValue, sessionId), { message: 'hello-world' })
  })
})
