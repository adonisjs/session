'use strict'

/*
 * adonis-server
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const http = require('http')
const supertest = require('supertest')
const { Config } = require('@adonisjs/sink')
const helpers = require('./helpers')

const Session = require('../src/Session')
const FlashGlobals = require('../src/Session/FlashGlobals')
const { cookie: Cookie } = require('../src/Session/Drivers')

test.group('Flash Messages', () => {
  test('store flash messages to the session', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        session.flash({ username: 'virk' })
        return session.commit()
      })
      .then(() => {
        res.end()
      })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.deepEqual(helpers.getValueObject(headers['set-cookie'][1]), {
      __flash__: {
        t: 'Object',
        d: JSON.stringify({ username: 'virk' })
      }
    })
  })

  test('merge to existing flash values', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        session.flash({ username: 'virk' })
        session.flash({ age: 22 })
        return session.commit()
      })
      .then(() => {
        res.end()
      })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.deepEqual(helpers.getValueObject(headers['set-cookie'][1]), {
      __flash__: {
        t: 'Object',
        d: JSON.stringify({ username: 'virk', age: 22 })
      }
    })
  })

  test('add errors as flash message', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        session.withErrors([{ field: 'username', message: 'username is required' }]).flash({ username: 'virk' })
        return session.commit()
      })
      .then(() => {
        res.end()
      })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.deepEqual(helpers.getValueObject(headers['set-cookie'][1]), {
      __flash__: {
        t: 'Object',
        d: JSON.stringify({
          errors: [{
            field: 'username',
            message: 'username is required'
          }],
          username: 'virk'
        })
      }
    })
  })

  test('throw exception when flash data is not object', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        session.flash('username', 'virk')
        return session.commit()
      })
      .then(() => {
        res.end()
      })
      .catch(({ message, status }) => {
        res.writeHead(status || 500)
        res.write(message)
        res.end()
      })
    })

    const { text } = await supertest(server).get('/').expect(500)
    assert.equal(text, 'E_INVALID_PARAMETER: Flash data should be an object instead received string')
  })
})

test.group('Flash View Globals', () => {
  test('return flash message from view globals', (assert) => {
    const View = {
      flashMessages: { username: 'virk' },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.equal(View.$globals.old('username'), 'virk')
  })

  test('return error messages from flash messages', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: [{ message: 'Some error message' }] },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.deepEqual(View.$globals.errors(), [{ message: 'Some error message' }])
  })

  test('return error message for a specific field', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: [{ message: 'Some error message', field: 'username' }] },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.equal(View.$globals.getErrorFor('username'), 'Some error message')
  })

  test('return true when has errors', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: [{ message: 'Some error message', field: 'username' }] },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.isTrue(View.$globals.hasErrors())
  })

  test('return false when no errors', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: [] },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.isFalse(View.$globals.hasErrors())
  })

  test('return error from a plain object', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: { username: 'username is required' } },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.equal(View.$globals.getErrorFor('username'), 'username is required')
  })

  test('return error from a plain object', (assert) => {
    const View = {
      flashMessages: { username: 'virk', errors: { username: 'username is required' } },
      $globals: {},
      global: function (name, callback) {
        this.$globals[name] = callback.bind(this)
      }
    }

    FlashGlobals(View)
    assert.equal(View.$globals.getErrorFor('username'), 'username is required')
  })
})
