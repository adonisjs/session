/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Store } from '../src/Store'

test.group('Store', () => {
  test('return empty object for empty store', ({ assert }) => {
    const store = new Store(null)
    assert.deepEqual(store.toJSON(), {})
  })

  test('mutate values inside store', ({ assert }) => {
    const store = new Store({})
    store.set('username', 'virk')
    assert.deepEqual(store.toJSON(), { username: 'virk' })
  })

  test('mutate nested values inside store', ({ assert }) => {
    const store = new Store({})
    store.set('user.username', 'virk')
    assert.deepEqual(store.toJSON(), { user: { username: 'virk' } })
  })

  test('remove value from store', ({ assert }) => {
    const store = new Store(null)
    store.set('user.username', 'virk')
    store.unset('user.username')
    assert.deepEqual(store.toJSON(), { user: {} })
  })

  test('increment value inside store', ({ assert }) => {
    const store = new Store(null)
    store.set('user.age', 22)
    store.increment('user.age')
    assert.deepEqual(store.toJSON(), { user: { age: 23 } })
  })

  test('decrement value inside store', ({ assert }) => {
    const store = new Store(null)
    store.set('user.age', 22)
    store.decrement('user.age')
    assert.deepEqual(store.toJSON(), { user: { age: 21 } })
  })

  test('find if value exists in the store', ({ assert }) => {
    const store = new Store({})
    assert.isFalse(store.has('username'))

    store.update({ username: 'virk' })
    assert.isTrue(store.has('username'))
  })

  test('check for arrays length', ({ assert }) => {
    const store = new Store({})
    assert.isFalse(store.has('users'))

    store.update({ users: [] })
    assert.isFalse(store.has('users'))

    store.update({ users: ['virk'] })
    assert.isTrue(store.has('users'))
  })

  test('do not check for array length when explicitly said no', ({ assert }) => {
    const store = new Store({})
    assert.isFalse(store.has('users'))

    store.update({ users: [] })
    assert.isTrue(store.has('users', false))

    store.update({ users: ['virk'] })
    assert.isTrue(store.has('users'))
  })
})
