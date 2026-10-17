/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getPort from 'get-port'
import { readdir } from 'node:fs/promises'
import { test } from '@japa/runner'
import { Router } from '@adonisjs/core/http'
import { Emitter } from '@adonisjs/core/events'
import { AppFactory } from '@adonisjs/core/factories/app'
import { Encryption, EncryptionManager } from '@adonisjs/core/encryption'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { AES256GCM } from '@adonisjs/core/encryption/drivers/aes_256_gcm'
import { type ApplicationService, type EventsList } from '@adonisjs/core/types'
import {
  RouterFactory,
  RequestFactory,
  ResponseFactory,
  HttpContextFactory,
} from '@adonisjs/core/factories/http'

import { Session } from '../../src/session.ts'
import { type SessionConfig } from '../../src/types.ts'
import { MemoryStore } from '../../src/stores/memory.ts'
import { FileStore } from '../../src/stores/file.ts'
import { defineConfig, stores } from '../../src/define_config.ts'
import { httpServer, runJapaTest } from '../../tests_helpers/index.ts'

const app = new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService

const emitter = new Emitter<EventsList>(app)
const encryption = new EncryptionFactory().create()

const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  cookieName: 'adonis_session',
  cookie: {},
}

test.group('Browser client', (group) => {
  group.setup(async () => {
    app.useConfig({
      session: defineConfig({
        store: 'memory',
        stores: {},
      }),
    })
    await app.init()
    await app.boot()
    app.container.singleton(Router, () => new RouterFactory().create())
    app.container.alias('router', Router)
    app.container.singleton(Encryption, () => encryption)
    app.container.singleton(
      'encryption',
      () =>
        new EncryptionManager({
          default: 'gcm',
          list: {
            gcm: {
              driver(key) {
                return new AES256GCM({
                  key,
                  id: 'gcm',
                })
              },
              keys: ['averystrongrandomsecretkey'],
            },
          },
        })
    )
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

    await runJapaTest(app, async ({ visit, browserContext }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setSession({ username: 'virk' })
      await visit(url)

      assert.lengthOf(MemoryStore.sessions, 1)
      await browserContext.close()
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

    await runJapaTest(app, async ({ browserContext, visit }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setFlashMessages({ username: 'virk' })
      await visit(url)

      /**
       * Since the server clears the session after
       * reading the flash messages, the store
       * should be empty post visit
       */
      assert.lengthOf(MemoryStore.sessions, 0)
      await browserContext.close()
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

    await runJapaTest(app, async ({ browserContext, visit }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setFlashMessages({ username: 'virk' })
      await visit(url)

      assert.deepEqual(await browserContext.getSession(), { name: 'virk' })

      assert.lengthOf(MemoryStore.sessions, 1)
      await browserContext.close()
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

    await runJapaTest(app, async ({ browserContext, visit }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setFlashMessages({ username: 'virk' })
      await visit(url)

      assert.deepEqual(await browserContext.getFlashMessages(), { name: 'virk' })

      assert.lengthOf(MemoryStore.sessions, 1)
      await browserContext.close()
      assert.lengthOf(MemoryStore.sessions, 0)
    })
  })

  test('write the session to the configured store', async ({ assert, fs, cleanup }) => {
    app.config.set(
      'session',
      defineConfig({ store: 'file', stores: { file: stores.file({ location: fs.basePath }) } })
    )
    cleanup(() => app.config.set('session', defineConfig({ store: 'memory', stores: {} })))

    let seen: unknown
    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const fileStore = () => new FileStore({ location: fs.basePath }, '2 hours')
      const session = new Session(sessionConfig, fileStore, emitter, ctx)

      await session.initiate(false)
      seen = session.all()

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ visit, browserContext }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setSession({ username: 'virk' })
      await visit(url)
      await browserContext.close()
      assert.deepEqual(await readdir(fs.basePath), [])
    })

    assert.deepEqual(seen, { username: 'virk' })
    assert.lengthOf(MemoryStore.sessions, 0)
  })

  test('set the session again after the application destroyed it', async ({
    assert,
    fs,
    cleanup,
  }) => {
    app.config.set(
      'session',
      defineConfig({ store: 'file', stores: { file: stores.file({ location: fs.basePath }) } })
    )
    cleanup(() => app.config.set('session', defineConfig({ store: 'memory', stores: {} })))

    const server = httpServer.create(async (req, res) => {
      const request = new RequestFactory().merge({ req, res, encryption }).create()
      const response = new ResponseFactory().merge({ req, res, encryption }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      const fileStore = () => new FileStore({ location: fs.basePath }, '2 hours')
      const session = new Session(sessionConfig, fileStore, emitter, ctx)

      await session.initiate(false)
      session.clear()

      await session.commit()
      response.finish()
    })

    const port = await getPort({ port: 3333 })
    const url = `http://localhost:${port}`
    server.listen(port)

    await runJapaTest(app, async ({ visit, browserContext }) => {
      await browserContext.initiateSession({ domain: new URL(url).host, path: '/' })
      await browserContext.setSession({ user: 42 })
      assert.deepEqual(await browserContext.getSession(), { user: 42 })

      await visit(url)

      await browserContext.setSession({ user: 43 })
      assert.deepEqual(await browserContext.getSession(), { user: 43 })
      await browserContext.close()
    })
  })
})
