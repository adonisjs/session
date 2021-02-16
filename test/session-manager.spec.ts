/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/session.ts" />

import test from 'japa'
import supertest from 'supertest'
import { createServer } from 'http'
import { MessageBuilder } from '@poppinss/utils/build/helpers'
import { Application } from '@adonisjs/core/build/standalone'

import { Store } from '../src/Store'
import { SessionManager } from '../src/SessionManager'
import { setup, fs, sessionConfig, unsignCookie, getRedisManager } from '../test-helpers'

test.group('Session Manager', (group) => {
	group.afterEach(async () => {
		await fs.cleanup()
	})

	test('do not set maxAge when clearWithBrowser is true', async (assert) => {
		const app = await setup()
		const server = createServer(async (req, res) => {
			const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

			const manager = new SessionManager(
				new Application(__dirname, 'web', {}),
				Object.assign({}, sessionConfig, { clearWithBrowser: true })
			)
			const session = manager.create(ctx)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')
		assert.lengthOf(header['set-cookie'][0].split(';'), 2)
	})

	test('set maxAge when clearWithBrowser is false', async (assert) => {
		const app = await setup()
		const server = createServer(async (req, res) => {
			const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

			const manager = new SessionManager(new Application(__dirname, 'web', {}), sessionConfig)
			const session = manager.create(ctx)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')
		assert.lengthOf(header['set-cookie'][0].split(';'), 3)

		const maxAge = header['set-cookie'][0].split(';')[1].replace(' Max-Age=', '')
		assert.equal(maxAge, '3000')
	})

	test('use file driver to persist session value', async (assert) => {
		const app = await setup()
		const server = createServer(async (req, res) => {
			const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

			const customConfig = Object.assign({}, sessionConfig, {
				driver: 'file',
				file: {
					location: fs.basePath,
				},
			})

			const manager = new SessionManager(new Application(__dirname, 'web', {}), customConfig)
			const session = manager.create(ctx)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(app, header, sessionConfig.cookieName)
		const sessionContents = await fs.get(`${sessionId}.txt`)
		const sessionValues = new MessageBuilder().verify<any>(sessionContents, sessionId)
		assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })
	})

	test('use redis driver to persist session value', async (assert) => {
		const app = await setup()

		app.container.singleton('Adonis/Addons/Redis', () => getRedisManager(app))

		const server = createServer(async (req, res) => {
			const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

			const customConfig = Object.assign({}, sessionConfig, {
				driver: 'redis',
				redisConnection: 'session',
			})

			const manager = new SessionManager(app, customConfig)
			const session = manager.create(ctx)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')
		const sessionId = unsignCookie(app, header, sessionConfig.cookieName)

		const sessionContents = await app.container
			.use('Adonis/Addons/Redis')
			.connection('session')
			.get(sessionId)

		const sessionValues = new MessageBuilder().verify<any>(sessionContents, sessionId)
		assert.deepEqual(new Store(sessionValues).all(), { user: { username: 'virk' } })

		await app.container.use('Adonis/Addons/Redis').connection('session').del(sessionId)
	})

	test('extend by adding a custom driver', async (assert) => {
		assert.plan(1)

		const app = await setup(
			Object.assign({}, sessionConfig, {
				driver: 'mongo',
			})
		)

		class MongoDriver {
			public read() {
				return {}
			}
			public write(_, data: any) {
				assert.deepEqual(data, { name: 'virk' })
			}
			public touch() {}
			public destroy() {}
		}

		app.container.singleton('Adonis/Addons/Redis', () => getRedisManager(app))
		app.container.use('Adonis/Addons/Session').extend('mongo', () => {
			return new MongoDriver()
		})

		const session = app.container
			.use('Adonis/Addons/Session')
			.create(app.container.use('Adonis/Core/HttpContext').create('/', {}))

		await session.initiate(false)
		session.put('name', 'virk')
		await session.commit()
	})
})
