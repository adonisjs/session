/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import { CookieOptions } from '@adonisjs/core/types/http'
import type { SessionData, SessionDriverContract } from '../types/main.js'
import debug from '../debug.js'

/**
 * Cookie driver stores the session data inside an encrypted
 * cookie.
 */
export class CookieDriver implements SessionDriverContract {
  #ctx: HttpContext
  #config: Partial<CookieOptions>

  constructor(config: Partial<CookieOptions>, ctx: HttpContext) {
    this.#config = config
    this.#ctx = ctx
    debug('initiating cookie driver %O', this.#config)
  }

  /**
   * Read session value from the cookie
   */
  read(sessionId: string): SessionData | null {
    debug('cookie driver: reading session data %s', sessionId)

    const cookieValue = this.#ctx.request.encryptedCookie(sessionId)
    if (typeof cookieValue !== 'object') {
      return null
    }

    return cookieValue
  }

  /**
   * Write session values to the cookie
   */
  write(sessionId: string, values: SessionData): void {
    debug('cookie driver: writing session data %s: %O', sessionId, values)
    this.#ctx.response.encryptedCookie(sessionId, values, this.#config)
  }

  /**
   * Removes the session cookie
   */
  destroy(sessionId: string): void {
    debug('cookie driver: destroying session data %s', sessionId)
    if (this.#ctx.request.cookiesList()[sessionId]) {
      this.#ctx.response.clearCookie(sessionId)
    }
  }

  /**
   * Updates the cookie with existing cookie values
   */
  touch(sessionId: string): void {
    const value = this.read(sessionId)
    debug('cookie driver: touching session data %s', sessionId)
    if (!value) {
      return
    }

    this.write(sessionId, value)
  }
}
