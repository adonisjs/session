'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const { Config } = require('@adonisjs/sink')
const http = require('http')
const supertest = require('supertest')
const helpers = require('./helpers')

const { cookie: Cookie } = require('../src/Session/Drivers')

test.group('Drivers - Cookie', () => {
  test('set default options when config is missing', (assert) => {
    const cookie = new Cookie(new Config())
    assert.isTrue(cookie._options.httpOnly)
    assert.isTrue(cookie._options.sameSite)
    assert.isAbove(Date.parse(cookie._options.expires) - Date.now(), 1000 * 60 * 90)
  })

  test('convert session age to millseconds when defined', (assert) => {
    const config = new Config()
    config.set('session.age', '20 mins')
    const cookie = new Cookie(config)
    assert.isTrue(cookie._options.httpOnly)
    assert.isTrue(cookie._options.sameSite)
    assert.isAbove(Date.parse(cookie._options.expires) - Date.now(), 1000 * 60 * 19)
    assert.isBelow(Date.parse(cookie._options.expires) - Date.now(), 1000 * 60 * 60)
  })

  test('session age as millseconds when defined', (assert) => {
    const config = new Config()
    config.set('session.age', 1000 * 60 * 20)
    const cookie = new Cookie(config)
    assert.isTrue(cookie._options.httpOnly)
    assert.isTrue(cookie._options.sameSite)
    assert.isAbove(Date.parse(cookie._options.expires) - Date.now(), 1000 * 60 * 19)
    assert.isBelow(Date.parse(cookie._options.expires) - Date.now(), 1000 * 60 * 60)
  })

  test('set values on cookie', async (assert) => {
    const server = http.createServer((req, res) => {
      const cookie = new Cookie(new Config())
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      cookie.write(1, { username: 'virk', age: 22 })
      res.end()
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.property(headers, 'set-cookie')
    const sessionValue = helpers.getValueObject(headers['set-cookie'][0])
    assert.deepEqual(sessionValue, { username: 'virk', age: 22 })
  })

  test('read existing values from cookie', async (assert) => {
    const server = http.createServer((req, res) => {
      const cookie = new Cookie(new Config())
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write(JSON.stringify(cookie.read()))
      res.end()
    })

    const { body } = await supertest(server).get('/').set('Cookie', ['adonis-session-values=22']).expect(200)
    assert.deepEqual(body, '22')
  })

  test('touch cookies when expiry is set', async (assert) => {
    const server = http.createServer((req, res) => {
      const cookie = new Cookie(new Config())
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      cookie.touch(1, '22')
      res.end()
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.property(headers, 'set-cookie')
    const sessionValue = helpers.getValueObject(headers['set-cookie'][0])
    assert.equal(sessionValue, '22')
  })
})
