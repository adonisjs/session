/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { RedisService } from '@adonisjs/redis/types'
import supertest from 'supertest'
import { createServer } from 'node:http'

import { Store } from '../src/store.js'
import { Session } from '../src/session.js'
import { MemoryDriver } from '../src/drivers/memory.js'
import {
  setup,
  sessionConfig,
  unsignCookie,
  signCookie,
  createHttpContext,
} from '../test_helpers/index.js'

test.group('Session', (group) => {
  group.each.teardown(async () => {
    MemoryDriver.sessions.clear()
  })

  test("initiate session with fresh session id when there isn't any session", async ({
    assert,
    fs,
  }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      assert.isTrue(session.fresh)
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server).get('/')
  })

  test('initiate session with empty store when session id exists', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      assert.isFalse(session.fresh)
      assert.equal(session.sessionId, '1234')
      assert.isTrue(session.initiated)
      res.end()
    })

    await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))
  })

  test('write session values with driver on commit', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('re-use existing session id', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.equal(sessionId, '1234')

    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
  })

  test('retain driver existing values', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.put('user.username', 'virk')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toJSON())

    /**
     * Request
     */
    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.equal(sessionId, '1234')

    /**
     * Ensure driver has existing + new values
     */
    const session = MemoryDriver.sessions.get('1234')!
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
  })

  test('regenerate session id when regenerate method is called', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
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
    const store = new Store(null)
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    assert.notEqual(sessionId, '1234')

    const session = MemoryDriver.sessions.get(sessionId)!
    assert.equal(MemoryDriver.sessions.size, 1)
    assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })

    /**
     * Ensure old values have been cleared
     */
    assert.isUndefined(MemoryDriver.sessions.get('1234'))
  })

  test('get session value', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)
      ctx.response.send(session.get('user.age'))
      await session.commit()
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toJSON())

    /**
     * Request
     */
    const { text } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    assert.equal(text, '22')
  })

  test('get nested value using form input syntax', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)
      ctx.response.send(session.get('user[age]'))
      await session.commit()
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('user.age', 22)
    MemoryDriver.sessions.set('1234', store.toJSON())

    /**
     * Request
     */
    const { text } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    assert.equal(text, '22')
  })
})

test.group('Session | Flash', (group) => {
  group.each.teardown(async () => {
    MemoryDriver.sessions.clear()
  })

  test('set custom flash messages', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flash('success', 'User created succesfully')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    /**
     * Ensure session id is changed
     */
    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        success: 'User created succesfully',
      },
    })
  })

  test('flash input values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)
      ctx.request.setInitialBody({ username: 'virk', age: 28 })

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flashAll()
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        age: 28,
      },
    })
  })

  test('flash selected input values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flashOnly(['username', 'profile.twitterHandle'])
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)

    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      },
    })
  })

  test("flash all input values except the defined one's", async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flashExcept(['age'])
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        profile: {
          twitterHandle: '@AmanVirk1',
        },
      },
    })
  })

  test('flash input along with custom messages', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      ctx.request.setInitialBody({
        username: 'virk',
        age: 28,
      })

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flashExcept(['age'])
      session.flash('success', 'User created')
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        success: 'User created',
      },
    })
  })

  test('read old flash values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
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
    const store = new Store(null)
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {})
  })

  test('read selected old values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      assert.deepEqual(session.flashMessages.get('username'), 'virk')

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {})
  })

  test('flash custom messages as an object', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flash({ success: 'User created succesfully' })
      session.flash({ error: 'There was an error too :wink' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        success: 'User created succesfully',
        error: 'There was an error too :wink',
      },
    })
  })

  test('always flash original input values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      ctx.request.setInitialBody({ username: 'virk', age: 28 })
      ctx.request.updateBody({ username: 'nikk', age: 22 })

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.flashAll()
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        age: 28,
      },
    })
  })

  test('do not attempt to commit when initiate raises an exception', async ({ assert, fs }) => {
    assert.plan(3)
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      ctx.request.setInitialBody({ username: 'virk', age: 28 })
      ctx.request.updateBody({ username: 'nikk', age: 22 })

      const driver = new MemoryDriver()
      driver.read = function () {
        throw new Error('Blowup')
      }

      const session = new Session(ctx, sessionConfig, driver)

      try {
        await session.initiate(false)
      } catch (error) {
        assert.equal(error.message, 'Blowup')
      }

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!

    assert.deepEqual(new Store(session).all(), {})
  })

  test('reflash existing flash values', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)
      session.reflash()
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
        success: 'User created',
      },
    })
  })

  test('cherry pick keys during reflash', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.reflashOnly(['username'])

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        username: 'virk',
      },
    })
  })

  test('ignore keys during reflash', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      const driver = new MemoryDriver()
      const session = new Session(ctx, sessionConfig, driver)
      await session.initiate(false)

      session.reflashExcept(['username'])

      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    /**
     * Initial driver value
     */
    const store = new Store(null)
    store.set('__flash__', {
      username: 'virk',
      success: 'User created',
    })

    MemoryDriver.sessions.set('1234', store.toJSON())

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', await signCookie(app, '1234', sessionConfig.cookieName))

    const sessionId = await unsignCookie(app, header, sessionConfig.cookieName)
    assert.exists(sessionId)
    const session = MemoryDriver.sessions.get(sessionId)!
    assert.deepEqual(new Store(session).all(), {
      __flash__: {
        success: 'User created',
      },
    })
  })

  test('should not store session if empty - redis', async ({ assert, fs }) => {
    const { app } = await setup(fs, {
      redis: {
        connection: 'session',
        connections: {
          session: {
            host: process.env.REDIS_HOST || '0.0.0.0',
            port: process.env.REDIS_PORT || 6379,
          },
        },
      },

      session: {
        driver: 'redis',
        cookieName: 'adonis-session',
        age: '2h',
        redisConnection: 'session',
      },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)
      await ctx.session.commit()

      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const sessionId = await unsignCookie(app, header, 'adonis-session')
    const redis = (await app.container.make('redis')) as RedisService

    const sessionValue = await redis.get(sessionId)
    assert.isNull(sessionValue)
  })

  test('should delete session storage if empty - redis', async ({ assert, fs }) => {
    const { app } = await setup(fs, {
      redis: {
        connection: 'session',
        connections: {
          session: {
            host: process.env.REDIS_HOST || '0.0.0.0',
            port: process.env.REDIS_PORT || 6379,
          },
        },
      },

      session: {
        driver: 'redis',
        cookieName: 'adonis-session',
        age: '2h',
        redisConnection: 'session',
      },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)

      if (ctx.request.qs().set) {
        ctx.session.put('user', { username: 'jul' })
      }

      if (ctx.request.qs().delete) {
        ctx.session.forget('user')
      }

      await ctx.session.commit()

      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/?set=1')
    const sessionId = await unsignCookie(app, header, 'adonis-session')
    const redis = (await app.container.make('redis')) as RedisService

    const sessionValue = await redis.get(sessionId)
    assert.isNotNull(sessionValue)

    const { header: header2 } = await supertest(server)
      .get('/?delete=1')
      .set('cookie', await signCookie(app, sessionId, 'adonis-session'))

    const sessionId2 = await unsignCookie(app, header2, 'adonis-session')
    assert.equal(sessionId, sessionId2)

    const sessionValue2 = await redis.get(sessionId2)
    assert.isNull(sessionValue2)
  })
})
