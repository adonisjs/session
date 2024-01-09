/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { SessionClient } from '../src/client.js'
import { MemoryStore } from '../src/stores/memory.js'

test.group('Session Client', (group) => {
  group.each.teardown(async () => {
    MemoryStore.sessions.clear()
  })

  test('define session data using session id', async ({ assert }) => {
    const driver = new MemoryStore()
    const client = new SessionClient(driver)

    client.merge({ foo: 'bar' })
    client.flash({ success: true })
    await client.commit()

    assert.deepEqual(driver.read(client.sessionId), {
      foo: 'bar',
      __flash__: {
        success: true,
      },
    })
  })

  test('load data from the store', async ({ assert }) => {
    const driver = new MemoryStore()
    const client = new SessionClient(driver)

    client.merge({ foo: 'bar' })
    client.flash({ success: true })
    await client.commit()

    assert.deepEqual(await client.load(), {
      values: {
        foo: 'bar',
      },
      flashMessages: {
        success: true,
      },
    })
  })

  test('destroy session', async ({ assert }) => {
    const driver = new MemoryStore()
    const client = new SessionClient(driver)

    client.merge({ foo: 'bar' })
    client.flash({ success: true })
    await client.commit()

    assert.deepEqual(await client.load(), {
      values: {
        foo: 'bar',
      },
      flashMessages: {
        success: true,
      },
    })

    await client.destroy()

    assert.deepEqual(await client.load(), {
      values: {},
      flashMessages: {},
    })
  })
})
