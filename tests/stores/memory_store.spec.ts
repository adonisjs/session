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
    return () => {
      MemoryStore.sessions.clear()
      MemoryStore.tags.clear()
    }
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

  test('tag a session with a user id', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 'user-123')

    assert.equal(MemoryStore.tags.get('session-1'), 'user-123')
  })

  test('get sessions tagged with a user id', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.write('session-2', { message: 'world' })
    session.write('session-3', { message: 'foo' })

    await session.tag('session-1', 'user-1')
    await session.tag('session-2', 'user-1')
    await session.tag('session-3', 'user-2')

    const user1Sessions = await session.tagged('user-1')
    assert.sameMembers(user1Sessions, ['session-1', 'session-2'])

    const user2Sessions = await session.tagged('user-2')
    assert.deepEqual(user2Sessions, ['session-3'])
  })

  test('return empty array when user has no tagged sessions', async ({ assert }) => {
    const session = new MemoryStore()

    const sessions = await session.tagged('unknown-user')
    assert.deepEqual(sessions, [])
  })

  test('destroy cleans up tag reference', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 'user-1')

    session.destroy('session-1')

    assert.isFalse(MemoryStore.tags.has('session-1'))

    const sessions = await session.tagged('user-1')
    assert.deepEqual(sessions, [])
  })

  test('tagged filters out destroyed sessions', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.write('session-2', { message: 'world' })
    await session.tag('session-1', 'user-1')
    await session.tag('session-2', 'user-1')

    MemoryStore.sessions.delete('session-1')

    const sessions = await session.tagged('user-1')
    assert.deepEqual(sessions, ['session-2'])
  })
})
