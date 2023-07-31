/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { cuid } from '@adonisjs/core/helpers'
import type { CookieClient } from '@adonisjs/core/http'

import { Store } from './store.js'
import type { SessionConfig, SessionData, SessionDriverContract } from './types/main.js'

/**
 * Session client exposes the API to set session data as a client
 */
export class SessionClient {
  /**
   * Session configuration
   */
  #config: SessionConfig

  /**
   * The session driver to use for reading and writing session data
   */
  #driver: SessionDriverContract

  /**
   * Cookie client contract to sign and unsign cookies
   */
  #cookieClient: CookieClient

  /**
   * Session to use when no explicit session id is
   * defined
   */
  #sessionId = cuid()

  /**
   * Session key for setting flash messages
   */
  flashKey = '__flash__'

  constructor(config: SessionConfig, driver: SessionDriverContract, cookieClient: CookieClient) {
    this.#config = config
    this.#driver = driver
    this.#cookieClient = cookieClient
  }

  /**
   * Load session data from the driver
   */
  async load(
    cookies: Record<string, any>,
    sessionId?: string
  ): Promise<{ sessionId: string; session: SessionData; flashMessages: SessionData }> {
    const sessionIdCookie = cookies[this.#config.cookieName]
    const sessId = sessionId || sessionIdCookie ? sessionIdCookie.value : this.#sessionId

    const contents = await this.#driver.read(sessId)
    const store = new Store(contents)
    const flashMessages = store.pull(this.flashKey, null)

    return {
      sessionId: sessId,
      session: store.all(),
      flashMessages,
    }
  }

  /**
   * Commits the session data to the session store and returns
   * the session id and cookie name for it to be accessible
   * by the server
   */
  async commit(values: SessionData | null, flashMessages: SessionData | null, sessionId?: string) {
    const sessId = sessionId || this.#sessionId

    /**
     * Persist session data to the store, alongside flash messages
     */
    if (values || flashMessages) {
      await this.#driver.write(sessId, Object.assign({ [this.flashKey]: flashMessages }, values))
    }

    return {
      sessionId: sessId,
      signedSessionId: this.#cookieClient.sign(this.#config.cookieName, sessId)!,
      cookieName: this.#config.cookieName,
    }
  }

  /**
   * Clear the session store
   */
  async forget(sessionId?: string) {
    await this.#driver.destroy(sessionId || this.#sessionId)
  }
}
