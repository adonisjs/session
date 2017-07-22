'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const { Config } = require('@adonisjs/sink')
const Redis = require('ioredis')
const helpers = require('./helpers')

class RedisFactory {
  constructor (config) {
    return new Redis(config)
  }
}

const { redis: RedisDriver } = require('../src/Session/Drivers')

test.group('Driver - Redis', () => {
  test('initiate redis driver', (assert) => {
    const redisDriver = new RedisDriver(new Config(), RedisFactory)
    assert.instanceOf(redisDriver, RedisDriver)
  })

  test('set value when 2 hours of expiry', async (assert) => {
    const redisDriver = new RedisDriver(new Config(), RedisFactory)
    await redisDriver.write(1, 'session-data')
    const ttl = await redisDriver.redis.ttl(1)
    assert.equal(ttl, (60 * 60) * 2)
  })

  test('set ttl as defined in config', async (assert) => {
    const config = new Config()
    config.set('session.age', '1 hr')
    const redisDriver = new RedisDriver(config, RedisFactory)
    await redisDriver.write(1, 'session-data')
    const ttl = await redisDriver.redis.ttl(1)
    assert.equal(ttl, (60 * 60))
  })

  test('set ttl as defined in config in milliseconds', async (assert) => {
    const config = new Config()
    config.set('session.age', 1000 * 60 * 60)
    const redisDriver = new RedisDriver(config, RedisFactory)
    await redisDriver.write(1, 'session-data')
    const ttl = await redisDriver.redis.ttl(1)
    assert.equal(ttl, (60 * 60))
  })

  test('read session value', async (assert) => {
    const config = new Config()
    config.set('session.age', 1000 * 60 * 60)
    const redisDriver = new RedisDriver(config, RedisFactory)
    await redisDriver.redis.set(1, 'session-data')
    const value = await redisDriver.read(1)
    assert.equal(value, 'session-data')
  })

  test('touch session expiry', async (assert) => {
    const config = new Config()
    const redisDriver = new RedisDriver(config, RedisFactory)
    await redisDriver.write(1, 'session-data')
    await helpers.sleep(2000)
    const ttl = await redisDriver.redis.ttl(1)
    assert.isBelow(ttl, 60 * 60 * 2)
    await redisDriver.touch(1)
    const newTtl = await redisDriver.redis.ttl(1)
    assert.equal(newTtl, 60 * 60 * 2)
  }).timeout(0)
})
