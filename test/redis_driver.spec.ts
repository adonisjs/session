/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { RedisDriver } from '../src/drivers/redis.js'
import { setup, sleep, sessionConfig, getRedisManager } from '../test_helpers/index.js'

const config = Object.assign({}, sessionConfig, { driver: 'redis', redisConnection: 'session' })

test.group('Redis driver', () => {
  test('return null when value is missing', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const sessionId = '1234'
    const redis = getRedisManager(app)
    const session = new RedisDriver(config, redis)

    const value = await session.read(sessionId)
    await redis.disconnectAll()
    assert.isNull(value)
  })

  test('write session value to the redis store', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const sessionId = '1234'
    const redis = getRedisManager(app)

    const session = new RedisDriver(config, redis)
    await session.write(sessionId, { message: 'hello-world' })

    const contents = await redis.connection('session').get('1234')
    await redis.connection('session').del('1234')
    await redis.disconnectAll()

    assert.deepEqual(JSON.parse(contents!), {
      message: { message: 'hello-world' },
      purpose: '1234',
    })
  })

  test('get session existing value', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const sessionId = '1234'
    const redis = getRedisManager(app)

    await redis.connection('session').set(
      '1234',
      JSON.stringify({
        message: { message: 'hello-world' },
        purpose: '1234',
      })
    )

    const session = new RedisDriver(config, redis)
    const contents = await session.read(sessionId)
    await redis.connection('session').del('1234')
    await redis.disconnectAll()

    assert.deepEqual(contents, { message: 'hello-world' })
  })

  test('remove session', async ({ assert, fs }) => {
    const { app } = await setup(fs)

    const sessionId = '1234'
    const redis = getRedisManager(app)

    await redis.connection('session').set(
      '1234',
      JSON.stringify({
        message: { message: 'hello-world' },
        purpose: '1234',
      })
    )

    const session = new RedisDriver(config, redis)
    let contents = await session.read(sessionId)
    assert.deepEqual(contents, { message: 'hello-world' })

    await session.destroy('1234')
    contents = await session.read(sessionId)

    await redis.disconnectAll()
    assert.isNull(contents)
  })

  test('update session expiry', async ({ fs, assert }) => {
    const { app } = await setup(fs)

    const sessionId = '1234'
    const redis = getRedisManager(app)

    const session = new RedisDriver(config, redis)
    await redis.connection('session').set(
      '1234',
      JSON.stringify({
        message: { message: 'hello-world' },
        purpose: '1234',
      })
    )

    await sleep(1000)

    let expiry = await redis.connection('session').ttl('1234')
    assert.isBelow(expiry, 3)

    /**
     * Update expiry
     */
    await session.touch(sessionId)
    expiry = await redis.connection('session').ttl('1234')
    assert.equal(expiry, 3)

    const contents = await session.read(sessionId)
    await session.destroy('1234')
    await redis.disconnectAll()

    assert.deepEqual(contents, { message: 'hello-world' })
  }).timeout(0)
})
