/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { CookieClient } from '@adonisjs/core/http'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'

import { SessionClient } from '../src/client.js'
import type { SessionConfig } from '../src/types/main.js'
import { MemoryDriver } from '../src/drivers/memory.js'

const encryption = new EncryptionFactory().create()
const cookieClient = new CookieClient(encryption)
const sessionConfig: SessionConfig = {
  enabled: true,
  age: '2 hours',
  clearWithBrowser: false,
  cookieName: 'adonis_session',
  driver: 'cookie',
  cookie: {},
}

test.group('Session Client', (group) => {
  group.each.teardown(async () => {
    MemoryDriver.sessions.clear()
  })

  test('define session data using session id', async ({ assert }) => {
    const driver = new MemoryDriver()
    const client = new SessionClient(sessionConfig, driver, cookieClient)
    const { sessionId, signedSessionId, cookieName } = await client.commit(
      { foo: 'bar' },
      { success: true }
    )

    assert.equal(cookieName, 'adonis_session')
    assert.equal(cookieClient.unsign(cookieName, signedSessionId), sessionId)
    assert.deepEqual(driver.read(sessionId), {
      foo: 'bar',
      __flash__: {
        success: true,
      },
    })
  })

  test('read existing session data', async ({ assert }) => {
    const driver = new MemoryDriver()
    const client = new SessionClient(sessionConfig, driver, cookieClient)
    const { sessionId } = await client.commit({ foo: 'bar' }, { success: true })

    assert.deepEqual(await client.load({}), {
      sessionId,
      session: {
        foo: 'bar',
      },
      flashMessages: {
        success: true,
      },
    })
  })

  test('clear session data', async ({ assert }) => {
    const driver = new MemoryDriver()
    const client = new SessionClient(sessionConfig, driver, cookieClient)
    const { sessionId } = await client.commit({ foo: 'bar' }, { success: true })

    await client.forget()

    assert.deepEqual(await client.load({}), {
      sessionId,
      session: {},
      flashMessages: null,
    })
  })
})
