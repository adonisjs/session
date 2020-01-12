/**
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
import { serialize, parse } from '@poppinss/cookie'
import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'

import { Store } from '../src/Store'
import { Session } from '../src/Session'
import { MemoryDriver } from '../src/Drivers/Memory'
import { createCtx, SECRET } from '../test-helpers/index'

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

  test('initiate session with fresh session id when there isn\'t any session', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server).get('/')
  })

  test('initiate session with empty store when session id exists', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      assert.isFalse(session.fresh)
      assert.equal(session.sessionId, '1234')
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server).get('/').set('cookie', serialize(config.cookieName, '1234', SECRET)!)
  })

  test('write session values with driver on commit', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)

    assert.property(cookies.signedCookies, config.cookieName)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('re-use existing session id', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('retain driver existing values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.put('user.username', 'virk')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
  })

  test('regenerate session id when regenerate method is called', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.regenerate()

      session.put('user.username', 'virk')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.notEqual(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
    assert.isUndefined(MemoryDriver.sessions.get('1234'))
  })

  test('remove session values when the store is empty', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.forget('user')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toString())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    assert.isUndefined(MemoryDriver.sessions.get('1234'))
  })
})

test.group('Session | Flash', (group) => {
  group.afterEach(() => {
    MemoryDriver.sessions.clear()
  })

  test('flash custom messages', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flash('success', 'User created succesfully')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        success: 'User created succesfully',
      },
    })
  })

  test('flash input values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      ctx.request.setInitialBody({ username: 'virk', age: 28 })

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flashAll()
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        age: 28,
      },
    })
  })

  test('flash selected input values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flashOnly(['username', 'profile.twitterHandle'])
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      },
    })
  })

  test('flash all input values except the defined one\'s', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flashExcept(['age'])
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      },
    })
  })

  test('flash selected input values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flashOnly(['username', 'profile.twitterHandle'])
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      },
    })
  })

  test('flash input along with custom messages', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})
      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flashExcept(['age'])
      session.flash('success', 'User created')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        success: 'User created',
      },
    })
  })

  test('pull old flash values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      assert.deepEqual(session.flashMessages.all(), {
        username: 'virk',
        success: 'User created',
      })

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toString())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), {})
  })

  test('pull selected old values', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      assert.deepEqual(session.flashMessages.get('username'), 'virk')

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store('')
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toString())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize(config.cookieName, '1234', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.equal(cookies.signedCookies[config.cookieName], '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), {})
  })

  test('flash custom messages as an object', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const driver = new MemoryDriver()
      const session = new Session(ctx, config, driver)
      await session.initiate(false)

      session.flash({
        'success': 'User created succesfully',
      })
      session.flash({
        'error': 'There was an error too :wink',
      })

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    const session = MemoryDriver.sessions.get(cookies.signedCookies[config.cookieName])!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        success: 'User created succesfully',
        error: 'There was an error too :wink',
      },
    })
  })
})
