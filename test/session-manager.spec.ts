/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/session.ts" />

import ms from 'ms'
import test from 'japa'
import supertest from 'supertest'
import { createServer } from 'http'
import { Ioc } from '@adonisjs/fold'
import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'

import { SessionManager } from '../src/SessionManager'
import { createCtx, SECRET } from '../test-helpers'

const config: SessionConfigContract = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: '2h',
  cookie: {
    path: '/',
  },
}

test.group('Session Manager', () => {
  test('do not set expiry clearWithBrowser is true', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const manager = new SessionManager(new Ioc(), Object.assign({}, config, { clearWithBrowser: true }))
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

  test('set expiry when clearWithBrowser is false', async (assert) => {
    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const manager = new SessionManager(new Ioc(), config)
      const session = manager.create(ctx)
      await session.initiate(false)

      session.put('user', { username: 'virk' })
      await session.commit()
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    assert.lengthOf(header['set-cookie'][0].split(';'), 3)

    const expires = header['set-cookie'][0].split(';')[2].replace('Expires=', '')
    assert.equal(ms(Date.parse(expires) - Date.now()), '2h')
  })
})
