/*
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

import { CookieDriver } from '../src/drivers/cookie.js'
import {
  setup,
  sessionConfig,
  encryptCookie,
  decryptCookie,
  createHttpContext,
} from '../test_helpers/index.js'

test.group('Cookie driver', () => {
  test('return null object when cookie is missing', async ({ fs, assert }) => {
    assert.plan(1)

    const { app } = await setup(fs)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = new CookieDriver(sessionConfig, ctx)
      const value = session.read(sessionId)
      assert.isNull(value)
      res.end()
    })

    await supertest(server).get('/')
  })

  test('return empty object when cookie value is invalid', async ({ fs, assert }) => {
    assert.plan(1)

    const { app } = await setup(fs)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = new CookieDriver(sessionConfig, ctx)
      const value = session.read(sessionId)
      assert.isNull(value)
      res.end()
    })

    await supertest(server).get('/').set('cookie', '1234=hello-world')
  })

  test('return cookie values as an object', async ({ fs, assert }) => {
    const { app } = await setup(fs)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = new CookieDriver(sessionConfig, ctx)
      const value = session.read(sessionId)

      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(value))
      res.end()
    })

    const { body } = await supertest(server)
      .get('/')
      .set('cookie', await encryptCookie(app, { message: 'hello-world' }, sessionId))

    assert.deepEqual(body, { message: 'hello-world' })
  })

  test('write cookie value', async ({ fs, assert }) => {
    const { app } = await setup(fs)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = new CookieDriver(sessionConfig, ctx)
      session.write(sessionId, { message: 'hello-world' })

      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    assert.deepEqual(await decryptCookie(app, header, sessionId), { message: 'hello-world' })
  })

  test('update cookie with existing value', async ({ fs, assert }) => {
    const { app } = await setup(fs)
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = new CookieDriver(sessionConfig, ctx)
      session.touch(sessionId)

      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await encryptCookie(app, { message: 'hello-world' }, sessionId))

    assert.deepEqual(await decryptCookie(app, header, sessionId), { message: 'hello-world' })
  })
})
