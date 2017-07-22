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
const http = require('http')
const { ioc } = require('@adonisjs/fold')
const supertest = require('supertest')
const { Config } = require('@adonisjs/sink')

const Session = require('../src/Session')
const SessionManager = require('../src/Session/Manager')
const Middleware = require('../src/Session/Middleware')
const { redis: Redis } = require('../src/Session/Drivers')

test.group('Middleware', (group) => {
  group.beforeEach(() => {
    ioc.singleton('Adonis/Src/Config', () => {
      return new Config()
    })

    ioc.singleton('Adonis/Addons/RedisFactory', () => {
      return class RedisFactory {
        expire () {}
      }
    })
  })

  test('attach session instance on the http context', async (assert) => {
    const server = http.createServer((req, res) => {
      const request = {
        cookie: () => {}
      }

      const response = {
        cookie: () => {}
      }

      const context = { request, response }
      const middleware = new Middleware(ioc.use('Adonis/Src/Config'), SessionManager)
      middleware
        .handle(context, async function () {
          return true
        })
        .then(() => {
          assert.isDefined(context.session)
          assert.instanceOf(context.session, Session)
          res.end()
        }).catch(({ message }) => {
          console.log(message)
          res.writeHead(500)
          res.write(message)
          res.end()
        })
    })

    await supertest(server).get('/').expect(200)
  })

  test('do not call setRequest when driver has not implemented the method', async (assert) => {
    ioc.singleton('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('session.driver', 'redis')
      return config
    })

    const server = http.createServer((req, res) => {
      const request = {
        cookie: () => {}
      }

      const response = {
        cookie: () => {}
      }

      const context = { request, response }
      const middleware = new Middleware(ioc.use('Adonis/Src/Config'), SessionManager)
      middleware
        .handle(context, async function () {
          return true
        })
        .then(() => {
          assert.isDefined(context.session)
          assert.instanceOf(context.session._driverInstance, Redis)
          res.end()
        }).catch(({ message }) => {
          console.log(message)
          res.writeHead(500)
          res.write(message)
          res.end()
        })
    })

    await supertest(server).get('/').expect(200)
  })
})
