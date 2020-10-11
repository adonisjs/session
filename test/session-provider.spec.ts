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

import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application'

import { SessionManager } from '../src/SessionManager'

const fs = new Filesystem(join(__dirname, 'app'))

async function setup(sessionConfig: any) {
	await fs.add('.env', '')
	await fs.add(
		'config/app.ts',
		`
		export const appKey = 'averylong32charsrandomsecretkey',
		export const http = {
			cookie: {},
			trustProxy: () => true,
		}
	`
	)

	await fs.add(
		'config/session.ts',
		`
		const sessionConfig = ${JSON.stringify(sessionConfig, null, 2)}
		export default sessionConfig
	`
	)

	const app = new Application(fs.basePath, 'web', {
		providers: ['@adonisjs/core', '../../providers/SessionProvider'],
	})

	app.setup()
	app.registerProviders()
	await app.bootProviders()

	return app
}

test.group('Session Provider', (group) => {
	group.afterEach(async () => {
		await fs.cleanup()
	})

	test('register session provider', async (assert) => {
		const app = await setup({
			driver: 'cookie',
		})

		assert.instanceOf(app.container.use('Adonis/Addons/Session'), SessionManager)
		assert.deepEqual(
			app.container.use('Adonis/Addons/Session'),
			app.container.use('Adonis/Addons/Session')
		)
	})

	test('raise error when config is missing', async (assert) => {
		assert.plan(1)

		try {
			await setup({})
		} catch (error) {
			assert.equal(
				error.message,
				'Invalid "session" config. Missing value for "driver". Make sure to set it inside the "config/session" file'
			)
		}
	})
})
