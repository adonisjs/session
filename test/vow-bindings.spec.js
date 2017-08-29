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
const SessionClient = require('../src/Session/Client')
const VowRequest = require('../src/VowBindings/Request')

class Request {
  constructor () {
    this._getters = []
    this._macros = []
    this._hooks = []
  }

  getter (key, value, singleton) {
    this._getters.push({ key, value, singleton })
  }

  macro (key, value) {
    this._macros.push({ key, value })
  }

  before (fn) {
    this._hooks.push({ fn })
  }
}

test.group('Vow request', () => {
  test('add session getter to the request', (assert) => {
    const req = new Request()
    VowRequest(req, new Config())
    assert.lengthOf(req._getters, 1)
    assert.equal(req._getters[0].key, '_session')
    assert.instanceOf(req._getters[0].value(), SessionClient)
  })

  test('add macro to the request', (assert) => {
    const req = new Request()
    VowRequest(req, new Config())
    assert.lengthOf(req._macros, 1)
    assert.equal(req._macros[0].key, 'session')
  })

  test('add before hook', (assert) => {
    const req = new Request()
    VowRequest(req, new Config())
    assert.lengthOf(req._hooks, 1)
    assert.isFunction(req._hooks[0].fn)
  })
})
