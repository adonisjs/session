/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { SessionManager } from '../src/SessionManager'
import { fs, setup } from '../test-helpers'

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
		assert.deepEqual(app.container.use('Adonis/Addons/Session')['application'], app)
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
