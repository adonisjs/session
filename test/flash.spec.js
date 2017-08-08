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

const View = {
  resolve: function (key) {
    let value = this.$data[key]
    if (!value) {
      value = this.$globals[key]
      value = typeof (value) === 'function' ? value.bind(this) : value
    }
    return value
  },
  $globals: {},
  global: function (name, callback) {
    this.$globals[name] = callback
  },
  setData: function (key, values) {
    this.$data = {}
    this.$data[key] = values
  }
}

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

test.group('Flash View Globals', (group) => {
  group.before(() => {
    FlashGlobals(View)
  })

  test('return flash message from view globals', (assert) => {
    View.setData('flashMessages', { username: 'virk' })
    assert.equal(View.resolve('old')('username'), 'virk')
  })

  test('return error messages from flash messages', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: [{ message: 'Some error message' }] })

    assert.deepEqual(View.resolve('errors')(), [{ message: 'Some error message' }])
  })

  test('return error message for a specific field', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: [{ message: 'Some error message', field: 'username' }] })

    assert.equal(View.resolve('getErrorFor')('username'), 'Some error message')
  })

  test('return true when has errors', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: [{ message: 'Some error message', field: 'username' }] })

    assert.isTrue(View.resolve('hasErrors')())
  })

  test('return false when no errors', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: [] })

    assert.isFalse(View.resolve('hasErrors')())
  })

  test('return error from a plain object', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: { username: 'username is required' } })

    assert.equal(View.resolve('getErrorFor')('username'), 'username is required')
  })

  test('return error from a plain object', (assert) => {
    View
      .setData('flashMessages', { username: 'virk', errors: { username: 'username is required' } })

    assert.equal(View.resolve('getErrorFor')('username'), 'username is required')
  })
})
