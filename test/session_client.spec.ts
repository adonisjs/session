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
import { createServer } from 'http'
import setCookieParser from 'set-cookie-parser'

import { MemoryDriver } from '../src/drivers/memory.js'
import { setup, sessionConfig, createHttpContext } from '../test_helpers/index.js'
import { SessionManagerFactory } from '../factories/session_manager_factory.js'
import { CookieClient } from '@adonisjs/core/http'

test.group('Session Client', (group) => {
  group.each.teardown(async () => {
    MemoryDriver.sessions = new Map()
  })

  test('set session using the session client', async ({ fs, assert }) => {
    assert.plan(1)
    const { app } = await setup(fs)

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), { username: 'virk' })
      ctx.response.finish()
    })

    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('set flash messages', async ({ fs, assert }) => {
    assert.plan(1)
    const { app } = await setup(fs)

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const client = manager.client()
    client.flashMessages.merge({ foo: 'bar' })
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.flashMessages.all(), { foo: 'bar' })
      ctx.response.finish()
    })

    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('clear session store', async ({ fs, assert }) => {
    assert.plan(1)
    const { app } = await setup(fs)

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), {})
      ctx.response.finish()
    })

    await client.forget()
    await supertest(server).get('/').set('Cookie', `${cookieName}=${signedSessionId}`)
  })

  test('get session data from the driver', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const client = manager.client()
    client.set('username', 'virk')
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
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

    const cookieClient = new CookieClient(await app.container.make('encryption'))
    const cookies = setCookieParser.parse(response.header['set-cookie'], { map: true })
    const parsedCookies = Object.keys(cookies).reduce((result, key) => {
      const value = cookies[key]
      value.value = cookieClient.parse(value.name, value.value)
      result[key] = value
      return result
    }, {} as Record<string, any>)

    const { session, flashMessages } = await client.load(parsedCookies)

    assert.deepEqual(session, { username: 'virk', age: 22 })
    assert.isNull(flashMessages)
  })

  test('get flash messages from the driver', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManagerFactory().merge(config).create(app)

    const client = manager.client()
    const { signedSessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
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

    const cookieClient = new CookieClient(await app.container.make('encryption'))
    const cookies = setCookieParser.parse(response.header['set-cookie'], { map: true })
    const parsedCookies = Object.keys(cookies).reduce((result, key) => {
      const value = cookies[key]
      value.value = cookieClient.parse(value.name, value.value)
      result[key] = value
      return result
    }, {} as Record<string, any>)

    const { session, flashMessages } = await client.load(parsedCookies)

    assert.deepEqual(session, { username: 'virk' })
    assert.deepEqual(flashMessages, { foo: 'bar' })
  })
})
