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
import { Ioc } from '@adonisjs/fold'
import { MessageBuilder } from '@poppinss/utils'
import { Filesystem } from '@poppinss/dev-utils'
import { Redis } from '@adonisjs/redis/build/src/Redis'

import { Store } from '../src/Store'
import { SessionManager } from '../src/SessionManager'
import { createCtx, sessionConfig, unsignCookie } from '../test-helpers'

const fs = new Filesystem()

test.group('Session Manager', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('do not set maxAge when clearWithBrowser is true', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const manager = new SessionManager(
        new Ioc(),
        Object.assign({}, sessionConfig, { clearWithBrowser: true }),
      )
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    assert.lengthOf(header['set-cookie'][0].split(';'), 2)
  })

  test('set maxAge when clearWithBrowser is false', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const manager = new SessionManager(new Ioc(), sessionConfig)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    assert.lengthOf(header['set-cookie'][0].split(';'), 3)

    const maxAge = header['set-cookie'][0].split(';')[1].replace(' Max-Age=', '')
    assert.equal(maxAge, '3000')
  })

  test('use file driver to persist session value', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const customConfig = Object.assign({}, sessionConfig, {
        driver: 'file',
        file: {
          location: fs.basePath,
        },
      })

      const manager = new SessionManager(new Ioc(), customConfig)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')

    const sessionId = unsignCookie(header, sessionConfig.cookieName)
    const sessionContents = await fs.get(`${sessionId}.txt`)
    const sessionValues = new MessageBuilder().verify(sessionContents, sessionId)
    assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })
  })

  test('use redis driver to persist session value', async (assert) => {
    const ioc = new Ioc()

    ioc.singleton('Adonis/Addons/Redis', () => {
      return new Redis(ioc, {
        connections: {
          session: {},
        },
      } as any)
    })

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res, {})

      const customConfig = Object.assign({}, sessionConfig, {
        driver: 'redis',
        redisConnection: 'session',
      })

      const manager = new SessionManager(ioc, customConfig)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const sessionId = unsignCookie(header, sessionConfig.cookieName)
    const sessionContents = await ioc.use('Adonis/Addons/Redis').connection('session').get(sessionId)
    const sessionValues = new MessageBuilder().verify(sessionContents, sessionId)
    assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })

    await ioc.use('Adonis/Addons/Redis').connection('session').del(sessionId)
  })
})
