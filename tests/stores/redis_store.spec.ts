/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { defineConfig } from '@adonisjs/redis'
import { setTimeout } from 'node:timers/promises'
import { RedisManagerFactory } from '@adonisjs/redis/factories'

import { RedisStore } from '../../src/stores/redis.ts'

const sessionId = '1234'
const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: process.env.REDIS_HOST || '0.0.0.0',
      port: process.env.REDIS_PORT || 6379,
    },
  },
})
const redis = new RedisManagerFactory(redisConfig).create()

test.group('Redis store', (group) => {
  group.tap((t) => {
    t.skip(!!process.env.NO_REDIS, 'Redis not available in windows env')
  })

  group.each.setup(() => {
    return async () => {
      const sessionKeys = await redis.keys('session-*')
      const tagKeys = await redis.keys('session_tag:*')
      const testKeys = await redis.keys(sessionId)

      const allKeys = [...sessionKeys, ...tagKeys, ...testKeys]
      if (allKeys.length > 0) await redis.del(...allKeys)
    }
  })

  group.teardown(async () => {
    await redis.disconnectAll()
  })

  test('return null when value is missing', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')
    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('save session data', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')
    await session.write(sessionId, { message: 'hello-world' })

    assert.equal(
      await redis.get(sessionId),
      JSON.stringify({
        message: { message: 'hello-world' },
        purpose: sessionId,
      })
    )
  })

  test('return null when session data is expired', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), 1)
    await session.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    const value = await session.read(sessionId)
    assert.isNull(value)
  }).disableTimeout()

  test('ignore malformed contents', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), 1)
    await redis.set(sessionId, 'foo')

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('delete key on destroy', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')

    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    assert.isNull(await redis.get(sessionId))
  })

  test('update session expiry on touch', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), 10)
    await session.write(sessionId, { message: 'hello-world' })

    /**
     * Waiting a bit
     */
    await setTimeout(2000)

    /**
     * After waiting for a couple of seconds, the ttl should be
     * under 9 already
     */
    const expiry = await redis.ttl(sessionId)
    assert.isBelow(expiry, 9)

    await session.touch(sessionId)

    /**
     * Ensuring the new mTime is greater than the old mTime
     */
    const expiryPostTouch = await redis.ttl(sessionId)
    assert.isAtLeast(expiryPostTouch, 9)
  }).disableTimeout()

  test('tag a session with a user id', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')

    await session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 'user-123')

    const members = await redis.smembers('session_tag:user-123')
    assert.deepEqual(members, ['session-1'])
  })

  test('get sessions tagged with a user id', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')

    await session.write('session-1', { message: 'hello' })
    await session.write('session-2', { message: 'world' })
    await session.write('session-3', { message: 'foo' })

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
    const session = new RedisStore(redis.connection('main'), '2 hours')

    const sessions = await session.tagged('unknown-user')
    assert.deepEqual(sessions, [])
  })

  test('tagged filters out expired sessions', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), 1)

    await session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 'user-1')

    await setTimeout(2000)

    const sessions = await session.tagged('user-1')
    assert.deepEqual(sessions, [])
  }).disableTimeout()

  test('tagged cleans up expired sessions from tag set', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), 1)

    await session.write('session-1', { message: 'hello' })
    await session.tag('session-1', 'user-1')

    await setTimeout(2000)

    await session.tagged('user-1')

    const members = await redis.smembers('session_tag:user-1')
    assert.deepEqual(members, [])
  }).disableTimeout()
})
