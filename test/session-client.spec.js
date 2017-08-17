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
const { memoryStore } = require('../src/Session/Drivers/Memory')

const getReq = () => {
  return {
    cookies: [],
    setCookie (key, value) {
      this.cookies.push({ key, value })
    }
  }
}

test.group('Session client', (group) => {
  group.beforeEach(() => {
    memoryStore.clear()
  })

  test('initiate the session client', (assert) => {
    const req = getReq()
    const client = new SessionClient(req, new Config())
    client.instantiate()
    assert.isDefined(client._store)
  })

  test('add value to the store and set session id', (assert) => {
    const req = getReq()
    const client = new SessionClient(req, new Config())
    client.instantiate()
    client.put('username', 'virk')
    client.commit()
    assert.deepEqual(client._store._values, { username: 'virk' })
    assert.equal(client._sessionId, req.cookies[0].value)
  })

  test('get value from the session', (assert) => {
    const req = getReq()
    const client = new SessionClient(req, new Config())
    client.instantiate()
    client.put('username', 'virk')
    client.commit()
    assert.equal(client.get('username'), 'virk')
  })

  test('clear the memory driver and store', (assert) => {
    const req = getReq()
    const client = new SessionClient(req, new Config())
    client.instantiate()
    client.put('username', 'virk')
    client.commit()
    client.clear()
    assert.equal(memoryStore.size, 0)
    assert.deepEqual(client._store, { _values: {}, isDirty: true })
  })
})
