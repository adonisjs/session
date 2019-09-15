/*
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

import { CookieDriver } from '../src/Drivers/Cookie'
import { createCtx, SECRET } from '../test-helpers'

const config: SessionConfigContract = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

test.group('Cookie driver', () => {
  test('return empty string when cookie is missing', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const session = new CookieDriver(config, createCtx(req, res))
      const value = await session.read(sessionId)
      res.write(value)
      res.end()
    })

    const { text } = await supertest(server).get('/')
    assert.equal(text, '')
  })

  test('return empty string when cookie value is not signed', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const session = new CookieDriver(config, createCtx(req, res))
      const value = await session.read(sessionId)
      res.write(value)
      res.end()
    })

    const { text } = await supertest(server)
      .get('/')
      .set('cookie', '1234=hello-world')

    assert.equal(text, '')
  })

  test('return cookie value as string', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res)
      ctx.request['_config'].secret = SECRET

      const session = new CookieDriver(config, ctx)
      const value = await session.read(sessionId)
      res.write(value)
      res.end()
    })

    const { text } = await supertest(server)
      .get('/')
      .set('cookie', serialize('1234', 'hello-world', SECRET)!)

    assert.equal(text, 'hello-world')
  })

  test('write cookie value', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res)
      ctx.response['_config'].secret = SECRET

      const session = new CookieDriver(config, ctx)
      session.write(sessionId, 'hello-world')
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)

    assert.deepEqual(cookies, {
      signedCookies: { 1234: 'hello-world' },
      plainCookies: {},
    })
  })

  test('update cookie with existing value', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = createCtx(req, res)
      ctx.request['_config'].secret = SECRET
      ctx.response['_config'].secret = SECRET

      const session = new CookieDriver(config, ctx)
      await session.touch(sessionId)
      ctx.response.send('')
      ctx.response.finish()
    })

    const { header } = await supertest(server)
      .get('/')
      .set('cookie', serialize('1234', 'hello-world', SECRET)!)

    const cookies = parse(header['set-cookie'][0].split(';')[0], SECRET)
    assert.deepEqual(cookies, {
      signedCookies: { 1234: 'hello-world' },
      plainCookies: {},
    })
  })
})
