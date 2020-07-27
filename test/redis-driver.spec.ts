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
import { RedisDriver } from '../src/Drivers/Redis'
import { sleep, sessionConfig, getRedisManager } from '../test-helpers'

const config = Object.assign({}, sessionConfig, { driver: 'redis', redisConnection: 'session' })

test.group('Redis driver', () => {
	test('return null when value is missing', async (assert) => {
		const sessionId = '1234'
		const redis = getRedisManager()
		const session = new RedisDriver(config, redis)
		const value = await session.read(sessionId)
		assert.isNull(value)
	})

	test('write session value to the redis store', async (assert) => {
		const sessionId = '1234'
		const redis = getRedisManager()

		const session = new RedisDriver(config, redis)
		await session.write(sessionId, { message: 'hello-world' })

		const contents = await redis.connection('session').get('1234')
		assert.deepEqual(JSON.parse(contents!), {
			message: { message: 'hello-world' },
			purpose: '1234',
		})
		await redis.connection('session').del('1234')
	})

	test('get session existing value', async (assert) => {
		const sessionId = '1234'
		const redis = getRedisManager()

		await redis.connection('session').set(
			'1234',
			JSON.stringify({
				message: { message: 'hello-world' },
				purpose: '1234',
			})
		)

		const session = new RedisDriver(config, redis)
		const contents = await session.read(sessionId)
		assert.deepEqual(contents, { message: 'hello-world' })
		await redis.connection('session').del('1234')
	})

	test('remove session', async (assert) => {
		const sessionId = '1234'
		const redis = getRedisManager()

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
		assert.isNull(contents)
	})

	test('update session expiry', async (assert) => {
		const sessionId = '1234'
		const redis = getRedisManager()

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
		assert.isBelow(expiry, 3000)

		/**
		 * Update expiry
		 */
		await session.touch(sessionId)
		expiry = await redis.connection('session').ttl('1234')
		assert.equal(expiry, 3000)

		const contents = await session.read(sessionId)
		assert.deepEqual(contents, { message: 'hello-world' })

		await session.destroy('1234')
	}).timeout(0)
})
