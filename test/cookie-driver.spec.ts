/*
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
import { CookieDriver } from '../src/Drivers/Cookie'

import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'

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

test.group('Cookie driver', () => {
  test('return empty string when cookie is missing', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const session = new CookieDriver(config, HttpContext.create('/', {}, req, res))
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
      const session = new CookieDriver(config, HttpContext.create('/', {}, req, res))
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
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.request['_config'].secret = SECRET

      const session = new CookieDriver(config, ctx)
      const value = await session.read(sessionId)
      res.write(value)
      res.end()
    })

    const { text } = await supertest(server)
      .get('/')
      .set('cookie', serialize('1234', 'hello-world', SECRET))

    assert.equal(text, 'hello-world')
  })

  test('write cookie value', async (assert) => {
    const sessionId = '1234'

    const server = createServer(async (req, res) => {
      const ctx = HttpContext.create('/', {}, req, res)
      ctx.response['_config'].secret = SECRET

      const session = new CookieDriver(config, ctx)
      session.write(sessionId, 'hello-world')
      ctx.response.send('')
    })

    const { headers } = await supertest(server).get('/')
    const cookies = parse(headers['set-cookie'][0].split(';')[0], SECRET)

    assert.deepEqual(cookies, {
      signedCookies: { 1234: 'hello-world' },
      plainCookies: {},
    })
  })
})
