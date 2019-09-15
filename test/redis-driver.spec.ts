/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/session.ts" />

import test from 'japa'
import { Ioc } from '@adonisjs/fold'
import { Redis } from '@adonisjs/redis/build/src/Redis'
import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'

import { RedisDriver } from '../src/Drivers/Redis'

const config: SessionConfigContract = {
  driver: 'redis',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {},
  redisConnection: 'session',
}

test.group('Redis driver', () => {
  test('return empty string when value is missing', async (assert) => {
    const sessionId = '1234'
    const redis = new Redis(new Ioc(), {
      connections: {
        session: {},
      },
    } as any)

    const session = new RedisDriver(config, redis)
    const value = await session.read(sessionId)
    assert.equal(value, '')
  })

  test('write session value to the database', async (assert) => {
    const sessionId = '1234'
    const redis = new Redis(new Ioc(), {
      connections: {
        session: {},
      },
    } as any)

    const session = new RedisDriver(config, redis)
    await session.write(sessionId, 'hello-world')

    const contents = await redis.connection('session').get('1234')
    assert.equal(contents, 'hello-world')
    await redis.connection('session').del('1234')
  })

  test('get session existing value', async (assert) => {
    const sessionId = '1234'
    const redis = new Redis(new Ioc(), {
      connections: {
        session: {},
      },
    } as any)

    await redis.connection('session').set('1234', 'hello-world')

    const session = new RedisDriver(config, redis)
    const contents = await session.read(sessionId)
    assert.equal(contents, 'hello-world')
    await redis.connection('session').del('1234')
  })

  test('remove session', async (assert) => {
    const sessionId = '1234'
    const redis = new Redis(new Ioc(), {
      connections: {
        session: {},
      },
    } as any)

    await redis.connection('session').set('1234', 'hello-world')

    const session = new RedisDriver(config, redis)
    let contents = await session.read(sessionId)
    assert.equal(contents, 'hello-world')

    await session.destroy('1234')
    contents = await session.read(sessionId)
    assert.equal(contents, '')
  })
})
