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

import { RedisStore } from '../../src/stores/redis.js'

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
      await redis.del(sessionId)
    }
  })

  test('return null when value is missing', async ({ assert }) => {
    const session = new RedisStore(redis.connection('main'), '2 hours')
    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('save session data in a set', async ({ assert }) => {
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
     * Making sure the original mTime of the file was smaller
     * than the current time after wait
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
})
