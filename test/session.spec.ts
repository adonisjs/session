/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/session.ts" />

import * as test from 'japa'
import * as supertest from 'supertest'
import { createServer } from 'http'
import { HttpContext } from '@poppinss/http-server'
import { serialize, parse } from '@poppinss/cookie'
import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'

import { Store } from '../src/Store'
import { Session } from '../src/Session'
import { MemoryDriver } from '../src/Drivers/Memory'

const SECRET = Math.random().toFixed(36).substring(2, 38)

const config: SessionConfigContract = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

test.group('Session', (group) => {
  group.afterEach(() => {
    MemoryDriver.sessions.clear()
  })

  test('initiate session with fresh session id when there isn\'t session', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server).get('/')
  })

  test('initiate session with empty store when session id exists', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      assert.isFalse(session.fresh)
      assert.equal(session.sessionId, '1234')
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server).get('/').set('cookie', serialize(config.cookieName, '1234', SECRET))
  })

  test('write session values with driver on commit', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
    })

    const { headers } = await supertest(server).get('/')
    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)

    assert.property(cookies.signedCookies, config.cookieName)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('re-use existing session id', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
    })

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET))

    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('retain driver existing values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      session.put('user.username', 'virk')
      await session.commit()
      ctx.response.send('')
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET))

    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
  })

  test('regenerate session id when regenerate method is called', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      session.regenerate()

      session.put('user.username', 'virk')
      await session.commit()
      ctx.response.send('')
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET))

    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)
    assert.notEqual(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
    assert.isUndefined(MemoryDriver.sessions.get('1234'))
  })

  test('remove session values when the store is empty', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const driver = new MemoryDriver()
      const session = new Session(config, ctx, driver)
      await session.initiate(false)

      session.forget('user')
      await session.commit()
      ctx.response.send('')
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { headers } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET))

    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    assert.isUndefined(MemoryDriver.sessions.get('1234'))
  })
})
