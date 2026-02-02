/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { MemoryStore } from '../../src/stores/memory.ts'

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

  test('tag works with numeric user IDs', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 123)

    assert.equal(MemoryStore.tags.get('session-1'), '123')

    const sessions = await session.tagged('123')
    assert.deepEqual(sessions, [{ id: 'session-1', data: { message: 'hello' } }])
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
    assert.sameDeepMembers(user1Sessions, [
      { id: 'session-1', data: { message: 'hello' } },
      { id: 'session-2', data: { message: 'world' } },
    ])

    const user2Sessions = await session.tagged('user-2')
    assert.deepEqual(user2Sessions, [{ id: 'session-3', data: { message: 'foo' } }])
  })

  test('return empty array when user has no tagged sessions', async ({ assert }) => {
    const session = new MemoryStore()

    const sessions = await session.tagged('unknown-user')
    assert.deepEqual(sessions, [])
  })

  test('destroy cleans up tag reference', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.tag('session-1', 'user-1')

    session.destroy('session-1')

    assert.isFalse(MemoryStore.tags.has('session-1'))

    const sessions = session.tagged('user-1')
    assert.deepEqual(sessions, [])
  })

  test('tagged filters out destroyed sessions', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.write('session-2', { message: 'world' })
    session.tag('session-1', 'user-1')
    session.tag('session-2', 'user-1')

    MemoryStore.sessions.delete('session-1')

    const sessions = session.tagged('user-1')
    assert.deepEqual(sessions, [{ id: 'session-2', data: { message: 'world' } }])
  })

  test('untag removes tag from a session', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.tag('session-1', 'user-1')

    assert.isTrue(MemoryStore.tags.has('session-1'))

    session.untag('session-1', 'user-1')

    assert.isFalse(MemoryStore.tags.has('session-1'))
  })

  test('untag does not affect session data', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.tag('session-1', 'user-1')
    session.untag('session-1', 'user-1')

    assert.deepEqual(session.read('session-1'), { message: 'hello' })
  })

  test('untag removes session from tagged results', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.write('session-2', { message: 'world' })
    session.tag('session-1', 'user-1')
    session.tag('session-2', 'user-1')

    session.untag('session-1', 'user-1')

    const sessions = session.tagged('user-1')
    assert.deepEqual(sessions, [{ id: 'session-2', data: { message: 'world' } }])
  })

  test('untag on non-tagged session does not error', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })

    assert.doesNotThrow(() => {
      session.untag('session-1', 'user-1')
    })
  })

  test('tag before write preserves tag when session is written', async ({ assert }) => {
    const session = new MemoryStore()

    session.tag('new-session', 'user-123')
    session.write('new-session', { message: 'hello' })

    assert.equal(MemoryStore.tags.get('new-session'), 'user-123')

    const data = session.read('new-session')
    assert.deepEqual(data, { message: 'hello' })

    const sessions = session.tagged('user-123')
    assert.deepEqual(sessions, [{ id: 'new-session', data: { message: 'hello' } }])
  })

  test('tag is preserved after write updates session data', async ({ assert }) => {
    const session = new MemoryStore()

    session.write('session-1', { message: 'hello' })
    session.tag('session-1', 'user-123')

    session.write('session-1', { message: 'updated' })

    assert.equal(MemoryStore.tags.get('session-1'), 'user-123')
  })
})
