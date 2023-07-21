/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { createServer } from 'node:http'
import { ApiClient, ApiRequest } from '@japa/api-client'
import { createHttpContext, setup } from '../test_helpers/index.js'
import { SessionManager } from '../src/session_manager.js'
import { MemoryDriver } from '../src/drivers/memory.js'

test.group('Session Provider', (group) => {
  group.each.teardown(async () => {
    ApiClient.clearSetupHooks()
    ApiClient.clearTeardownHooks()
    ApiClient.clearRequestHandlers()
  })

  test('register session provider', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    assert.instanceOf(await app.container.make('session'), SessionManager)
    assert.deepEqual(await app.container.make('session'), await app.container.make('session'))
  })

  test('register test api request methods', async ({ assert, fs }) => {
    await setup(fs)

    assert.isTrue(ApiRequest.hasMacro('session'))
    assert.isTrue(ApiRequest.hasMacro('flashMessages'))
    assert.isTrue(ApiRequest.hasGetter('sessionClient'))
  })

  test('set session before making the api request', async ({ fs, assert }) => {
    const { app } = await setup(fs, {
      session: { driver: 'memory', cookieName: 'adonis-session' },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)

      try {
        ctx.response.send(ctx.session.all())
      } catch (error) {
        ctx.response.status(500).send(error.stack)
      }

      ctx.response.finish()
    })
    server.listen(3333)

    const client = new ApiClient('http://localhost:3333')
    const response = await client.get('/').session({ username: 'virk' })
    server.close()

    assert.deepEqual(response.status(), 200)
    assert.deepEqual(response.body(), { username: 'virk' })
  })

  test('get session data from the response', async ({ fs, assert }) => {
    const { app } = await setup(fs, {
      session: { driver: 'memory', cookieName: 'adonis-session' },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)
      ctx.session.put('username', 'virk')
      await ctx.session.commit()

      ctx.response.finish()
    })
    server.listen(3333)

    const client = new ApiClient('http://localhost:3333', assert)
    const response = await client.get('/')
    server.close()

    assert.equal(MemoryDriver.sessions.size, 0)
    assert.deepEqual(response.status(), 200)

    response.assertSession('username', 'virk')
    response.assertSessionMissing('age')
  })

  test('get flash messages from the response', async ({ fs, assert }) => {
    const { app } = await setup(fs, {
      session: { driver: 'memory', cookieName: 'adonis-session' },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)
      ctx.session.flash({ username: 'virk' })
      await ctx.session.commit()

      ctx.response.finish()
    })
    server.listen(3333)

    const client = new ApiClient('http://localhost:3333', assert)
    const response = await client.get('/')
    server.close()

    assert.equal(MemoryDriver.sessions.size, 0)
    assert.deepEqual(response.status(), 200)

    response.assertFlashMessage('username', 'virk')
    response.assertFlashMissing('age')
  })

  test('destroy session when request fails', async ({ fs, assert }) => {
    const { app } = await setup(fs, {
      session: { driver: 'memory', cookieName: 'adonis-session' },
    })

    const server = createServer(async (req, res) => {
      const ctx = await createHttpContext(app, req, res)

      await ctx.session.initiate(false)
      ctx.session.put('username', 'virk')
      await ctx.session.commit()

      ctx.response.status(500).send('Server error')
      ctx.response.finish()
    })
    server.listen(3333)

    const client = new ApiClient('http://localhost:3333', assert)
    await assert.rejects(() => client.get('/'))
    server.close()

    assert.equal(MemoryDriver.sessions.size, 0)
  })
})
