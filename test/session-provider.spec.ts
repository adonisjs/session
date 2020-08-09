/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Config } from '@adonisjs/config/build/standalone'
import { Emitter } from '@adonisjs/events/build/standalone'

import { SessionManager } from '../src/SessionManager'

test.group('Session Provider', () => {
	test('register session provider', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Config', () => {
			return new Config({
				session: {
					driver: 'cookie',
				},
			})
		})

		ioc.bind('Adonis/Core/Event', () => {
			return new Emitter(ioc)
		})

		const registrar = new Registrar(ioc, join(__dirname, '..'))
		await registrar.useProviders(['./providers/SessionProvider']).registerAndBoot()

		assert.instanceOf(ioc.use('Adonis/Addons/Session'), SessionManager)
		assert.deepEqual(ioc.use('Adonis/Addons/Session'), ioc.use('Adonis/Addons/Session'))
	})

	test('raise error when config is missing', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Config', () => {
			return new Config({})
		})

		ioc.bind('Adonis/Core/Event', () => {
			return new Emitter(ioc)
		})

		const registrar = new Registrar(ioc, join(__dirname, '..'))
		await registrar.useProviders(['./providers/SessionProvider']).registerAndBoot()

		const fn = () => ioc.use('Adonis/Addons/Session')
		assert.throw(
			fn,
			'Invalid "session" config. Missing value for "driver". Make sure to set it inside the "config/session" file'
		)
	})
})
