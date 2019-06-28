/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import * as test from 'japa'
import { ObjectId, ObjectID } from 'bson'
import { Store } from '../src/Store'

test.group('Store', () => {
  test('return empty JSON string for empty store', (assert) => {
    const store = new Store('{}')
    assert.equal(store.toString(), '{}')
  })

  test('mutate values inside store', (assert) => {
    const store = new Store('{}')
    store.set('username', 'virk')
    assert.equal(store.toString(), JSON.stringify({ username: { t: 'String', d: 'virk' } }))
  })

  test('mutate nested values inside store', (assert) => {
    const store = new Store('{}')
    store.set('user.username', 'virk')
    assert.equal(store.toString(), JSON.stringify({ user: { t: 'Object', d: { username: 'virk' } } }))
  })

  test('remove value from store', (assert) => {
    const store = new Store('{}')
    store.set('user.username', 'virk')
    store.unset('user.username')
    assert.equal(store.toString(), JSON.stringify({ user: { t: 'Object', d: {} } }))
  })

  test('add numbers to session store', (assert) => {
    const store = new Store('{}')
    store.set('age', 22)
    assert.deepEqual(new Store(store.toString()).all(), { age: 22 })
  })

  test('add boolean to session store', (assert) => {
    const store = new Store('{}')

    store.set('admin', false)
    store.set('guest', true)

    assert.deepEqual(new Store(store.toString()).all(), { admin: false, guest: true })
  })

  test('add object to session store', (assert) => {
    const store = new Store('{}')

    store.set('user', { username: 'virk' })
    assert.deepEqual(new Store(store.toString()).all(), { user: { username: 'virk' } })
  })

  test('add arrays to session store', (assert) => {
    const store = new Store('{}')

    store.set('users', [{ username: 'virk' }])
    assert.deepEqual(new Store(store.toString()).all(), { users: [{ username: 'virk' }] })
  })

  test('add date to session store', (assert) => {
    const store = new Store('{}')

    store.set('created_at', new Date())
    assert.instanceOf(new Store(store.toString()).all().created_at, Date)
  })

  test('add object id to session store', (assert) => {
    const store = new Store('{}')

    store.set('user_id', new ObjectId('123456789012'))
    assert.instanceOf(new Store(store.toString()).all().user_id, ObjectId)
  })

  test('add legacy object id to session store', (assert) => {
    const store = new Store('{}')

    store.set('user_id', new ObjectID('123456789012'))
    assert.instanceOf(new Store(store.toString()).all().user_id, ObjectId)
  })
})
