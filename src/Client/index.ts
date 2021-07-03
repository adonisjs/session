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

  constructor(
    private config: SessionConfig,
    private driver: SessionDriverContract,
    private cookieClient: CookieClientContract,
    values: { [key: string]: any } | null
  ) {
    super(values)
  }

  /**
   * Commits the session data to the session store and returns
   * the session id and cookie name for it to be accessible
   * by the server
   */
  public async commit() {
    await this.driver.write(this.sessionId, this.toJSON())
    this.clear()

    return {
      sessionId: this.cookieClient.sign(this.config.cookieName, this.sessionId)!,
      cookieName: this.config.cookieName,
    }
  }

  /**
   * Clear the session store
   */
  public async forget() {
    this.clear()
    this.driver.destroy(this.sessionId)
  }
}
