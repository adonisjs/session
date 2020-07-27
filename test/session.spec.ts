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

import { Store } from '../src/Store'
import { Session } from '../src/Session'
import { MemoryDriver } from '../src/Drivers/Memory'
import { createCtx, sessionConfig, unsignCookie, signCookie } from '../test-helpers/index'

test.group('Session', (group) => {
	group.afterEach(() => {
		MemoryDriver.sessions.clear()
	})

	test("initiate session with fresh session id when there isn't any session", async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			assert.isTrue(session.fresh)
			assert.isTrue(session.initiated)
			res.end()
		})

		await supertest(server).get('/')
	})

	test('initiate session with empty store when session id exists', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			assert.isFalse(session.fresh)
			assert.equal(session.sessionId, '1234')
			assert.isTrue(session.initiated)
			res.end()
		})

		await supertest(server).get('/').set('cookie', signCookie('1234', sessionConfig.cookieName))
	})

	test('write session values with driver on commit', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!
		assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
	})

	test('re-use existing session id', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.put('user', { username: 'virk' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('cookie', signCookie('1234', sessionConfig.cookieName))

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.equal(sessionId, '1234')

		const session = MemoryDriver.sessions.get('1234')!
		assert.deepEqual(new Store(session).all(), { user: { username: 'virk' } })
	})

	test('retain driver existing values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.put('user.username', 'virk')
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		/**
		 * Initial driver value
		 */
		const store = new Store(null)
		store.set('user.age', 22)
		MemoryDriver.sessions.set('1234', store.toJSON())

		/**
		 * Request
		 */
		const { header } = await supertest(server)
			.get('/')
			.set('cookie', signCookie('1234', sessionConfig.cookieName))

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.equal(sessionId, '1234')

		/**
		 * Ensure driver has existing + new values
		 */
		const session = MemoryDriver.sessions.get('1234')!
		assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })
	})

	test('regenerate session id when regenerate method is called', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.regenerate()

			session.put('user.username', 'virk')
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		/**
		 * Initial driver value
		 */
		const store = new Store(null)
		store.set('user.age', 22)
		MemoryDriver.sessions.set('1234', store.toJSON())

		const { header } = await supertest(server)
			.get('/')
			.set('cookie', signCookie('1234', sessionConfig.cookieName))

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		assert.notEqual(sessionId, '1234')

		const session = MemoryDriver.sessions.get(sessionId)!
		assert.deepEqual(new Store(session).all(), { user: { username: 'virk', age: 22 } })

		/**
		 * Ensure old values have been cleared
		 */
		assert.isUndefined(MemoryDriver.sessions.get('1234'))
	})
})

test.group('Session | Flash', (group) => {
	group.afterEach(() => {
		MemoryDriver.sessions.clear()
	})

	test('set custom flash messages', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flash('success', 'User created succesfully')
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		/**
		 * Ensure session id is changed
		 */
		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				success: 'User created succesfully',
			},
		})
	})

	test('flash input values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			ctx.request.setInitialBody({ username: 'virk', age: 28 })

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flashAll()
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				username: 'virk',
				age: 28,
			},
		})
	})

	test('flash selected input values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			ctx.request.setInitialBody({
				username: 'virk',
				age: 28,
				profile: {
					twitterHandle: '@AmanVirk1',
				},
			})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flashOnly(['username', 'profile.twitterHandle'])
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)

		const session = MemoryDriver.sessions.get(sessionId)!
		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				username: 'virk',
				profile: {
					twitterHandle: '@AmanVirk1',
				},
			},
		})
	})

	test("flash all input values except the defined one's", async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			ctx.request.setInitialBody({
				username: 'virk',
				age: 28,
				profile: {
					twitterHandle: '@AmanVirk1',
				},
			})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flashExcept(['age'])
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				username: 'virk',
				profile: {
					twitterHandle: '@AmanVirk1',
				},
			},
		})
	})

	test('flash input along with custom messages', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			ctx.request.setInitialBody({
				username: 'virk',
				age: 28,
			})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flashExcept(['age'])
			session.flash('success', 'User created')
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				username: 'virk',
				success: 'User created',
			},
		})
	})

	test('read old flash values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			assert.deepEqual(session.flashMessages.all(), {
				username: 'virk',
				success: 'User created',
			})

			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		/**
		 * Initial driver value
		 */
		const store = new Store(null)
		store.set('__flash__', {
			username: 'virk',
			success: 'User created',
		})

		MemoryDriver.sessions.set('1234', store.toJSON())

		const { header } = await supertest(server)
			.get('/')
			.set('cookie', signCookie('1234', sessionConfig.cookieName))

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!
		assert.deepEqual(new Store(session).all(), {})
	})

	test('read selected old values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			assert.deepEqual(session.flashMessages.get('username'), 'virk')

			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		/**
		 * Initial driver value
		 */
		const store = new Store(null)
		store.set('__flash__', {
			username: 'virk',
			success: 'User created',
		})

		MemoryDriver.sessions.set('1234', store.toJSON())

		const { header } = await supertest(server)
			.get('/')
			.set('cookie', signCookie('1234', sessionConfig.cookieName))

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!
		assert.deepEqual(new Store(session).all(), {})
	})

	test('flash custom messages as an object', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flash({ success: 'User created succesfully' })
			session.flash({ error: 'There was an error too :wink' })
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				success: 'User created succesfully',
				error: 'There was an error too :wink',
			},
		})
	})

	test('always flash original input values', async (assert) => {
		const server = createServer(async (req, res) => {
			const ctx = createCtx(req, res, {})
			ctx.request.setInitialBody({ username: 'virk', age: 28 })
			ctx.request.updateBody({ username: 'nikk', age: 22 })

			const driver = new MemoryDriver()
			const session = new Session(ctx, sessionConfig, driver)
			await session.initiate(false)

			session.flashAll()
			await session.commit()
			ctx.response.send('')
			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/')

		const sessionId = unsignCookie(header, sessionConfig.cookieName)
		assert.exists(sessionId)
		const session = MemoryDriver.sessions.get(sessionId)!

		assert.deepEqual(new Store(session).all(), {
			__flash__: {
				username: 'virk',
				age: 28,
			},
		})
	})
})
