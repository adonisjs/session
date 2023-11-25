/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getPort from 'get-port'
import { test } from '@japa/runner'
import { Emitter } from '@adonisjs/core/events'
import { AppFactory } from '@adonisjs/core/factories/app'
import { ApplicationService, EventsList } from '@adonisjs/core/types'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { HttpContextFactory, RequestFactory, ResponseFactory } from '@adonisjs/core/factories/http'

import { Session } from '../../src/session.js'
import { SessionConfig } from '../../src/types.js'
import { defineConfig } from '../../src/define_config.js'
import { MemoryStore } from '../../src/stores/memory.js'
import { httpServer, runJapaTest } from '../../tests_helpers/index.js'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService

const emitter = new Emitter<EventsList>(app)
const encryption = new EncryptionFactory().create()

const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  clearWithBrowser: false,
  cookieName: 'adonis_session',
  cookie: {},
}

test.group('Api client', (group) => {
  group.setup(async () => {
    app.useConfig({
      session: defineConfig({
        store: 'memory',
        stores: {},
      }),
    })
    await app.init()
    await app.boot()
    app.container.singleton('encryption', () => encryption)
  })

  test('set session from the client', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, () => new MemoryStore(), emitter, ctx)

      await session.initiate(false)
      assert.deepEqual(session.all(), { username: 'virk' })

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withSession({ username: 'virk' })
      assert.lengthOf(MemoryStore.sessions, 0)
    })
  })

  test('set flash messages from the client', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, () => new MemoryStore(), emitter, ctx)

      await session.initiate(false)
      assert.deepEqual(session.flashMessages.all(), { username: 'virk' })

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      await client.get(url).withFlashMessages({ username: 'virk' })
      assert.lengthOf(MemoryStore.sessions, 0)
    })
  })

  test('read response session data', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, () => new MemoryStore(), emitter, ctx)

      await session.initiate(false)
      session.put('name', 'virk')

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client.get(url)
      assert.deepEqual(response.session(), { name: 'virk' })
      assert.lengthOf(MemoryStore.sessions, 0)
    })
  })

  test('read response flashMessages', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, () => new MemoryStore(), emitter, ctx)

      await session.initiate(false)
      session.flash('name', 'virk')

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client.get(url)
      assert.deepEqual(response.flashMessages(), { name: 'virk' })
      assert.lengthOf(MemoryStore.sessions, 0)
    })
  })

  test('assert session and flash messages', async ({ assert }) => {
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const session = new Session(sessionConfig, () => new MemoryStore(), emitter, ctx)

      await session.initiate(false)
      session.put('name', 'virk')
      session.flash({
        succeed: false,
        hasErrors: true,
        errors: { username: ['field is required', 'field must be alpha numeric'] },
      })

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ client }) => {
      const response = await client.get(url)
      assert.lengthOf(MemoryStore.sessions, 0)

      response.assertSession('name')
      response.assertSession('name', 'virk')
      response.assertSessionMissing('age')

      response.assertFlashMessage('succeed')
      response.assertFlashMessage('hasErrors')
      response.assertFlashMessage('hasErrors', true)
      response.assertFlashMessage('succeed', false)
      response.assertFlashMissing('notifications')

      response.assertValidationError('username', 'field is required')
      response.assertValidationErrors('username', [
        'field is required',
        'field must be alpha numeric',
      ])
      response.assertDoesNotHaveValidationError('email')

      assert.throws(() => response.assertSession('name', 'foo'))
      assert.throws(() => response.assertSessionMissing('name'))
      assert.throws(() => response.assertFlashMissing('succeed'))
      assert.throws(() => response.assertFlashMessage('succeed', true))
      assert.throws(() => response.assertDoesNotHaveValidationError('username'))
      assert.throws(() => response.assertValidationError('username', 'field is missing'))
    })
  })
})
