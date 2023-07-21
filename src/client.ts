/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { cuid } from '@adonisjs/core/helpers'
import { Store } from './store.js'
import type { SessionConfig, SessionDriverContract } from './types.js'
import type { CookieClient } from '@adonisjs/core/http'

/**
 * SessionClient exposes the API to set session data as a client
 */
export class SessionClient extends Store {
  /**
   * Session configuration
   */
  #config: SessionConfig

  /**
   * The session driver used to read and write session data
   */
  #driver: SessionDriverContract

  /**
   * Cookie client contract to sign and unsign cookies
   */
  #cookieClient: CookieClient

  /**
   * Each instance of client works on a single session id. Generate
   * multiple client instances for a different session id
   */
  sessionId = cuid()

  /**
   * Session key for setting flash messages
   */
  #flashMessagesKey = '__flash__'

  /**
   * Flash messages store. They are merged with the session data during
   * commit
   */
  flashMessages = new Store({})

  constructor(
    config: SessionConfig,
    driver: SessionDriverContract,
    cookieClient: CookieClient,
    values: { [key: string]: any } | null
  ) {
    super(values)

    this.#config = config
    this.#driver = driver
    this.#cookieClient = cookieClient
  }

  /**
   * Find if the sessions are enabled
   */
  isEnabled() {
    return this.#config.enabled
  }

  /**
   * Load session from the driver
   */
  async load(cookies: Record<string, any>) {
    const sessionIdCookie = cookies[this.#config.cookieName]
    const sessionId = sessionIdCookie ? sessionIdCookie.value : this.sessionId

    const contents = await this.#driver.read(sessionId)
    const store = new Store(contents)
    const flashMessages = store.pull(this.#flashMessagesKey, null)

    return {
      session: store.all(),
      flashMessages,
    }
  }

  /**
   * Commits the session data to the session store and returns
   * the session id and cookie name for it to be accessible
   * by the server
   */
  async commit() {
    this.set(this.#flashMessagesKey, this.flashMessages.all())
    await this.#driver.write(this.sessionId, this.toJSON())

    /**
     * Clear from the session client memory
     */
    this.clear()
    this.flashMessages.clear()

    return {
      sessionId: this.sessionId!,
      signedSessionId: this.#cookieClient.sign(this.#config.cookieName, this.sessionId)!,
      cookieName: this.#config.cookieName,
    }
  }

  /**
   * Clear the session store
   */
  async forget() {
    /**
     * Clear from the session client memory
     */
    this.clear()
    this.flashMessages.clear()

    /**
     * Clear with the driver
     */
    await this.#driver.destroy(this.sessionId)
  }
}
