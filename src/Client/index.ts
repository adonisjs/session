/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { cuid } from '@poppinss/utils/build/helpers'
import {
  SessionConfig,
  SessionDriverContract,
  SessionClientContract,
} from '@ioc:Adonis/Addons/Session'

import { CookieClientContract } from '@ioc:Adonis/Core/CookieClient'
import { Store } from '../Store'

/**
 * SessionClient exposes the API to set session data as a client
 */
export class SessionClient extends Store implements SessionClientContract {
  /**
   * Each instance of client works on a single session id. Generate
   * multiple client instances for a different session id
   */
  private sessionId = cuid()

  /**
   * Session key for setting flash messages
   */
  private flashMessagesKey = '__flash__'

  /**
   * Flash messages store. They are merged with the session data during
   * commit
   */
  public flashMessages = new Store({})

  constructor(
    private config: SessionConfig,
    private driver: SessionDriverContract,
    private cookieClient: CookieClientContract,
    values: { [key: string]: any } | null
  ) {
    super(values)
  }

  /**
   * Find if the sessions are enabled
   */
  public isEnabled() {
    return this.config.enabled
  }

  /**
   * Load session from the driver
   */
  public async load() {
    const contents = await this.driver.read(this.sessionId)
    const store = new Store(contents)
    const flashMessages = store.pull(this.flashMessagesKey, null)

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
  public async commit() {
    this.set(this.flashMessagesKey, this.flashMessages.all())
    await this.driver.write(this.sessionId, this.toJSON())

    /**
     * Clear from the session client memory
     */
    this.clear()
    this.flashMessages.clear()

    return {
      sessionId: this.sessionId!,
      signedSessionId: this.cookieClient.sign(this.config.cookieName, this.sessionId)!,
      cookieName: this.config.cookieName,
    }
  }

  /**
   * Clear the session store
   */
  public async forget() {
    /**
     * Clear from the session client memory
     */
    this.clear()
    this.flashMessages.clear()

    /**
     * Clear with the driver
     */
    await this.driver.destroy(this.sessionId)
  }
}
