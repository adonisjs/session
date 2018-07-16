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

const SessionManager = require('../src/Session/Manager')
const Middleware = require('../src/Session/Middleware')
const getRequestInstance = require('../src/Session/getRequestInstance')

let sessionValues = ''

test.group('Middleware', (group) => {
  group.beforeEach(() => {
    ioc.singleton('Adonis/Src/Config', () => {
      return new Config()
    })

    ioc.singleton('Adonis/Addons/Redis', () => {
      class RedisFactory {
        expire () {
        }
        setex (sessionId, ttl, values) {
          sessionValues = values
        }
        get () {
          return sessionValues
        }
      }

      class Redis {
        constructor () {
          this.factory = new RedisFactory()
        }

        namedConnection () {
          return this.factory
        }
      }

      return new Redis()
    })
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

      const session = getRequestInstance(request, response, new Config(), SessionManager)
      const context = { request, response, session }
      const middleware = new Middleware()

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

      const session = getRequestInstance(request, response, ioc.use('Adonis/Src/Config'), SessionManager)
      const context = { request, response, view, session }
      const middleware = new Middleware()

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

  test('set flash messages on request', async (assert) => {
    ioc.singleton('Adonis/Src/Config', () => {
      const config = new Config()
      config.set('session.driver', 'redis')
      return config
    })

    const view = {
      share () {
      }
    }

    const request = {
      cookie: () => {
        return '20'
      }
    }

    const server = http.createServer((req, res) => {
      const response = {
        cookie: () => {}
      }

      const session = getRequestInstance(request, response, ioc.use('Adonis/Src/Config'), SessionManager)
      const context = { request, response, view, session }
      const middleware = new Middleware()

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
    assert.deepEqual(request.flashMessages, { username: 'virk' })
  })
})
