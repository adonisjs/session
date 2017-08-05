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
let sessionValues = ''

test.group('Middleware', (group) => {
  group.beforeEach(() => {
    ioc.singleton('Adonis/Src/Config', () => {
      return new Config()
    })

    ioc.singleton('Adonis/Addons/RedisFactory', () => {
      return class RedisFactory {
        expire () {
        }
        setex (sessionId, ttl, values) {
          sessionValues = values
        }
        get () {
          return sessionValues
        }
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

  test('pull flash messages on each request', async (assert) => {
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
          if (req.url === '/') {
            res.setHeader('Location', '/flash')
            context.session.flash({ username: 'virk' })
            res.writeHead(301)
            res.end()
          } else {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.write(JSON.stringify(context.session.get('__flash__', {})))
            res.end()
          }
        }).catch((error) => {
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server).get('/').redirects(1).expect(200)
    assert.deepEqual(body, {})
  })

  test('set flash messages as view locals', async (assert) => {
    ioc.singleton('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('session.driver', 'redis')
      return config
    })

    const view = {
      locals: {},
      share (locals) {
        this.locals = locals
      }
    }

    const server = http.createServer((req, res) => {
      const request = {
        cookie: () => {
          return '20'
        }
      }

      const response = {
        cookie: () => {}
      }

      const context = { request, response, view }
      const middleware = new Middleware(ioc.use('Adonis/Src/Config'), SessionManager)
      middleware
        .handle(context, async function () {
          return true
        })
        .then(() => {
          if (req.url === '/') {
            context.session.flash({ username: 'virk' })
          }
          return context.session.commit()
        })
        .then(() => {
          if (req.url === '/') {
            res.setHeader('Location', '/flash')
            res.writeHead(301)
            res.end()
          } else {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.write(JSON.stringify(context.session.get('__flash__', {})))
            res.end()
          }
        })
        .catch((error) => {
          console.log(error)
          res.writeHead(500)
          res.write(error.message)
          res.end()
        })
    })

    const { body } = await supertest(server).get('/').set('set-cookie', '[adonis-session=20]').redirects(1).expect(200)
    assert.deepEqual(body, {})
    assert.deepEqual(view.locals, {
      flashMessages: { username: 'virk' }
    })
  })
})
