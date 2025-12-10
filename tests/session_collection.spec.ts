/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { MemoryStore } from '../src/stores/memory.js'
import { SessionCollection } from '../src/session_collection.js'
import type { ResolvedSessionConfig, SessionStoreContract } from '../src/types.js'
import { E_SESSION_TAGGING_NOT_SUPPORTED } from '../src/errors.js'

function createFakeConfig(store: SessionStoreContract): ResolvedSessionConfig {
  return {
    enabled: true,
    cookieName: 'adonis_session',
    clearWithBrowser: false,
    age: '2h',
    cookie: {},
    store: 'test',
    stores: { test: () => store },
  }
}

test.group('Session Collection', (group) => {
  group.each.setup(() => {
    return () => {
      MemoryStore.sessions.clear()
      MemoryStore.tags.clear()
    }
  })

  test('get session data by id', async ({ assert }) => {
    const store = new MemoryStore()
    store.write('session-1', { user: 1, name: 'John' })

    const collection = new SessionCollection(createFakeConfig(store))

    const data = await collection.get('session-1')
    assert.deepEqual(data, { user: 1, name: 'John' })
  })

  test('return null when session does not exist', async ({ assert }) => {
    const store = new MemoryStore()
    const collection = new SessionCollection(createFakeConfig(store))

    const data = await collection.get('non-existent')
    assert.isNull(data)
  })

  test('destroy a session by id', async ({ assert }) => {
    const store = new MemoryStore()
    store.write('session-1', { user: 1 })
    store.write('session-2', { user: 2 })

    const collection = new SessionCollection(createFakeConfig(store))
    await collection.destroy('session-1')

    assert.isNull(store.read('session-1'))
    assert.isNotNull(store.read('session-2'))
  })
})

test.group('Session Collection | Tagging', (group) => {
  group.each.setup(() => {
    return () => {
      MemoryStore.sessions.clear()
      MemoryStore.tags.clear()
    }
  })

  test('tag a session with a user id', async ({ assert }) => {
    const store = new MemoryStore()
    store.write('session-1', { user: 1 })

    const collection = new SessionCollection(createFakeConfig(store))
    await collection.tag('session-1', 'user-123')

    assert.equal(MemoryStore.tags.get('session-1'), 'user-123')
  })

  test('get sessions tagged with a user id', async ({ assert }) => {
    const store = new MemoryStore()
    store.write('session-1', { user: 1 })
    store.write('session-2', { user: 1 })
    store.write('session-3', { user: 2 })

    const collection = new SessionCollection(createFakeConfig(store))
    await collection.tag('session-1', 'user-1')
    await collection.tag('session-2', 'user-1')
    await collection.tag('session-3', 'user-2')

    const user1Sessions = await collection.tagged('user-1')
    assert.sameMembers(user1Sessions, ['session-1', 'session-2'])

    const user2Sessions = await collection.tagged('user-2')
    assert.deepEqual(user2Sessions, ['session-3'])
  })

  test('return empty array when user has no tagged sessions', async ({ assert }) => {
    const store = new MemoryStore()
    const collection = new SessionCollection(createFakeConfig(store))

    const sessions = await collection.tagged('unknown-user')
    assert.deepEqual(sessions, [])
  })

  test('supportsTagging returns true for stores with tag and tagged methods', async ({
    assert,
  }) => {
    const store = new MemoryStore()
    const collection = new SessionCollection(createFakeConfig(store))

    assert.isTrue(collection.supportsTagging())
  })

  test('supportsTagging returns false for basic stores', async ({ assert }) => {
    const basicStore: SessionStoreContract = {
      read: () => null,
      write: () => {},
      destroy: () => {},
      touch: () => {},
    }

    const collection = new SessionCollection(createFakeConfig(basicStore))
    assert.isFalse(collection.supportsTagging())
  })

  test('throw error when tagging is not supported', async ({ assert }) => {
    const basicStore: SessionStoreContract = {
      read: () => null,
      write: () => {},
      destroy: () => {},
      touch: () => {},
    }

    const collection = new SessionCollection(createFakeConfig(basicStore))

    await assert.rejects(
      () => collection.tag('session-1', 'user-1'),
      // @ts-ignore Japa too strict
      E_SESSION_TAGGING_NOT_SUPPORTED
    )

    // @ts-ignore Japa too strict
    await assert.rejects(() => collection.tagged('user-1'), E_SESSION_TAGGING_NOT_SUPPORTED)
  })

  test('tagged excludes destroyed sessions', async ({ assert }) => {
    const store = new MemoryStore()
    store.write('session-1', { user: 1 })
    store.write('session-2', { user: 1 })

    const collection = new SessionCollection(createFakeConfig(store))
    await collection.tag('session-1', 'user-1')
    await collection.tag('session-2', 'user-1')

    await collection.destroy('session-1')

    const sessions = await collection.tagged('user-1')
    assert.deepEqual(sessions, ['session-2'])
  })
})
