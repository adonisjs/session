/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { SessionManager } from '../src/SessionManager'
import { fs, setup } from '../test-helpers'

test.group('Session Provider', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('register session provider', async ({ assert }) => {
    const app = await setup({
      driver: 'cookie',
    })

    assert.instanceOf(app.container.use('Adonis/Addons/Session'), SessionManager)
    assert.deepEqual(
      app.container.use('Adonis/Addons/Session'),
      app.container.use('Adonis/Addons/Session')
    )
    assert.deepEqual(app.container.use('Adonis/Addons/Session')['application'], app)
    assert.equal(app.container.use('Adonis/Core/Server').hooks['hooks'].before.length, 1)
    assert.equal(app.container.use('Adonis/Core/Server').hooks['hooks'].after.length, 1)
  })

  test('raise error when config is missing', async ({ assert }) => {
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

  test('do not register hooks when session is disabled', async ({ assert }) => {
    const app = await setup({
      enabled: false,
      driver: 'cookie',
    })

    assert.instanceOf(app.container.use('Adonis/Addons/Session'), SessionManager)
    assert.deepEqual(
      app.container.use('Adonis/Addons/Session'),
      app.container.use('Adonis/Addons/Session')
    )
    assert.deepEqual(app.container.use('Adonis/Addons/Session')['application'], app)
    assert.equal(app.container.use('Adonis/Core/Server').hooks['hooks'].before.length, 0)
    assert.equal(app.container.use('Adonis/Core/Server').hooks['hooks'].after.length, 0)
  })
})
