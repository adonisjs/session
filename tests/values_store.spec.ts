/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ValuesStore } from '../src/values_store.js'

test.group('Store', () => {
  test('return empty object for empty store', ({ assert }) => {
    const store = new ValuesStore(null)
    assert.deepEqual(store.toJSON(), {})
    assert.isTrue(store.isEmpty)
    assert.isFalse(store.hasBeenModified)
  })

  test('return default value when original value is null', ({ assert }) => {
    const store = new ValuesStore({ title: null } as any)
    assert.equal(store.get('title', ''), '')
  })

  test('mutate values inside store', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('username', 'virk')

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), { username: 'virk' })
  })

  test('mutate nested values inside store', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('user.username', 'virk')

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), { user: { username: 'virk' } })
  })

  test('remove value from store', ({ assert }) => {
    const store = new ValuesStore(null)
    store.set('user.username', 'virk')
    store.unset('user.username')

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), { user: {} })
  })

  test('increment value inside store', ({ assert }) => {
    const store = new ValuesStore(null)
    store.set('user.age', 22)
    store.increment('user.age')

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), { user: { age: 23 } })
  })

  test('throw when incrementing a non integer value', () => {
    const store = new ValuesStore(null)
    store.set('user.age', 'foo')
    store.increment('user.age')
  }).throws('Cannot increment "user.age". Existing value is not a number')

  test('decrement value inside store', ({ assert }) => {
    const store = new ValuesStore(null)
    store.set('user.age', 22)
    store.decrement('user.age')

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), { user: { age: 21 } })
  })

  test('throw when decrementing a non integer value', () => {
    const store = new ValuesStore(null)
    store.set('user.age', 'foo')
    store.decrement('user.age')
  }).throws('Cannot decrement "user.age". Existing value is not a number')

  test('find if value exists in the store', ({ assert }) => {
    const store = new ValuesStore({})
    assert.isFalse(store.has('username'))

    store.update({ username: 'virk' })

    assert.isTrue(store.has('username'))
    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
  })

  test('check for arrays length', ({ assert }) => {
    const store = new ValuesStore({})
    assert.isFalse(store.has('users'))

    store.update({ users: [] })
    assert.isFalse(store.has('users'))

    store.update({ users: ['virk'] })
    assert.isTrue(store.has('users'))
  })

  test('do not check for array length when explicitly said no', ({ assert }) => {
    const store = new ValuesStore({})
    assert.isFalse(store.has('users'))

    store.update({ users: [] })
    assert.isTrue(store.has('users', false))

    store.update({ users: ['virk'] })
    assert.isTrue(store.has('users'))
  })

  test('pull key from the store', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('username', 'virk')

    assert.equal(store.pull('username'), 'virk')

    assert.isTrue(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toJSON(), {})
  })

  test('deep merge with existing values', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('user', { profile: { username: 'virk' }, id: 1 })
    store.merge({ user: { profile: { age: 32 } } })

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)

    assert.deepEqual(store.toJSON(), { user: { id: 1, profile: { age: 32, username: 'virk' } } })
  })

  test('clear store', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('user', { profile: { username: 'virk' }, id: 1 })
    store.clear()

    assert.isTrue(store.isEmpty)
    assert.isTrue(store.hasBeenModified)
    assert.deepEqual(store.toObject(), {})
  })

  test('stringify store data object', ({ assert }) => {
    const store = new ValuesStore({})
    store.set('user', { profile: { username: 'virk' }, id: 1 })
    store.merge({ user: { profile: { age: 32 } } })

    assert.isFalse(store.isEmpty)
    assert.isTrue(store.hasBeenModified)

    assert.equal(
      store.toString(),
      JSON.stringify({ user: { profile: { username: 'virk', age: 32 }, id: 1 } })
    )
  })
})
