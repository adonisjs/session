/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/session.ts" />

import { test } from '@japa/runner'
import supertest from 'supertest'
import { createServer } from 'http'
import setCookieParser from 'set-cookie-parser'

import { MemoryDriver } from '../src/Drivers/Memory'
import { SessionManager } from '../src/SessionManager'
import { setup, fs, sessionConfig } from '../test-helpers'

test.group('Session Client', (group) => {
  group.each.teardown(async () => {
    MemoryDriver.sessions = new Map()
    await fs.cleanup()
  })

  test('set session using the session client', async ({ assert }) => {
    assert.plan(1)
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), { username: 'virk' })
      ctx.response.finish()
    })

    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('set flash messages', async ({ assert }) => {
    assert.plan(1)
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)

    const client = manager.client()
    client.flashMessages.merge({ foo: 'bar' })
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.flashMessages.all(), { foo: 'bar' })
      ctx.response.finish()
    })

    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('clear session store', async ({ assert }) => {
    assert.plan(1)
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), {})
      ctx.response.finish()
    })

    await client.forget()
    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('get session data from the driver', async ({ assert }) => {
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)
    const cookieClient = app.container.resolveBinding('Adonis/Core/CookieClient')

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)
      session.put('age', 22)
      session.regenerate()

      await session.commit()
      ctx.response.finish()
    })

    const response = await supertest(server)
      .get('/')
      .set('Cookie', `${cookieName}=${signedSessionId}`)

    const cookies = setCookieParser.parse(response.header['set-cookie'], { map: true })
    const parsedCookies = Object.keys(cookies).reduce((result, key) => {
      const value = cookies[key]
      value.value = cookieClient.parse(value.name, value.value)
      result[key] = value
      return result
    }, {})

    const { session, flashMessages } = await client.load(parsedCookies)

    assert.deepEqual(session, { username: 'virk', age: 22 })
    assert.isNull(flashMessages)
  })

  test('get flash messages from the driver', async ({ assert }) => {
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)
    const cookieClient = app.container.resolveBinding('Adonis/Core/CookieClient')

    const client = manager.client()
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.flash({ foo: 'bar' })
      session.put('username', 'virk')

      await session.commit()
      ctx.response.finish()
    })

    const response = await supertest(server)
      .get('/')
      .set('Cookie', `${cookieName}=${signedSessionId}`)

    const cookies = setCookieParser.parse(response.header['set-cookie'], { map: true })
    const parsedCookies = Object.keys(cookies).reduce((result, key) => {
      const value = cookies[key]
      value.value = cookieClient.parse(value.name, value.value)
      result[key] = value
      return result
    }, {})

    const { session, flashMessages } = await client.load(parsedCookies)

    assert.deepEqual(session, { username: 'virk' })
    assert.deepEqual(flashMessages, { foo: 'bar' })
  })
})
