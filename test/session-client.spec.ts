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

import { SessionManager } from '../src/SessionManager'
import { setup, fs, sessionConfig } from '../test-helpers'

test.group('Session Client', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('set session using the session client', async ({ assert }) => {
    assert.plan(1)
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)
    const client = manager.client()

    client.set('username', 'virk')
    const { sessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), { username: 'virk' })
      ctx.response.finish()
    })

    await supertest(server).get('/').set('Cookie', `${cookieName}=${sessionId}`)
  })

  test('clear session store', async ({ assert }) => {
    assert.plan(1)
    const app = await setup()

    const config = Object.assign({}, sessionConfig, { driver: 'memory', clearWithBrowser: true })
    const manager = new SessionManager(app, config)
    const client = manager.client()

    client.set('username', 'virk')
    const { sessionId, cookieName } = await client.commit()

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
      const session = manager.create(ctx)
      await session.initiate(false)

      assert.deepEqual(session.all(), {})
      ctx.response.finish()
    })

    await client.forget()
    await supertest(server).get('/').set('Cookie', `${cookieName}=${sessionId}`)
  })
})
