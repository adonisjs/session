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
const SessionStore = require('../src/Session/Store')

test.group('Session client', (group) => {
  test('initiate the session client', (assert) => {
    const client = new SessionClient(new Config())
    assert.instanceOf(client, SessionClient)
  })

  test('initiate session store and session id', (assert) => {
    const client = new SessionClient(new Config())
    client.instantiate()
    assert.instanceOf(client._store, SessionStore)
    assert.isDefined(client._sessionId)
  })

  test('get array of cookie key/value pairs', (assert) => {
    const client = new SessionClient(new Config())
    client.instantiate()
    client.put('name', 'virk')
    client.put('age', 22)

    const json = client.toJSON()
    assert.equal(json[0].key, 'adonis-session')
    assert.isDefined(json[0].value)
    assert.equal(json[1].key, 'adonis-session-values')
    assert.equal(json[1].value, JSON.stringify({
      name: { d: 'virk', t: 'String' },
      age: { d: '22', t: 'Number' }
    }))
  })
})
