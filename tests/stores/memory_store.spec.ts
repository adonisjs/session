/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { MemoryStore } from '../../src/stores/memory.js'

test.group('Memory store', (group) => {
  group.each.setup(() => {
    return () => MemoryStore.sessions.clear()
  })

  test('return null when session does not exists', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()

    assert.isNull(session.read(sessionId))
  })

  test('write to session store', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()
    session.write(sessionId, { message: 'hello-world' })

    assert.isTrue(MemoryStore.sessions.has(sessionId))
    assert.deepEqual(MemoryStore.sessions.get(sessionId), { message: 'hello-world' })
  })

  test('update existing session', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()

    session.write(sessionId, { message: 'hello-world' })
    assert.isTrue(MemoryStore.sessions.has(sessionId))
    assert.deepEqual(MemoryStore.sessions.get(sessionId), { message: 'hello-world' })

    session.write(sessionId, { foo: 'bar' })
    assert.isTrue(MemoryStore.sessions.has(sessionId))
    assert.deepEqual(MemoryStore.sessions.get(sessionId), { foo: 'bar' })
  })

  test('get session existing value', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()

    session.write(sessionId, { message: 'hello-world' })
    assert.isTrue(MemoryStore.sessions.has(sessionId))
    assert.deepEqual(session.read(sessionId), { message: 'hello-world' })
  })

  test('remove session on destroy', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()

    session.write(sessionId, { message: 'hello-world' })
    session.destroy(sessionId)

    assert.isFalse(MemoryStore.sessions.has(sessionId))
  })

  test('noop on touch', async ({ assert }) => {
    const sessionId = '1234'
    const session = new MemoryStore()

    session.write(sessionId, { message: 'hello-world' })
    session.touch()

    assert.deepEqual(MemoryStore.sessions.get(sessionId), { message: 'hello-world' })
  })
})
