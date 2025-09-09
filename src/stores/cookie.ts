/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { CookieOptions } from '@adonisjs/core/types/http'

import debug from '../debug.ts'
import type { SessionData, SessionStoreContract } from '../types.ts'

/**
 * Cookie store stores the session data inside an encrypted cookie.
 * Best for simple applications with minimal session data.
 *
 * @example
 * const cookieStore = new CookieStore({
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'strict'
 * }, ctx)
 */
export class CookieStore implements SessionStoreContract {
  /**
   * HTTP context for request/response operations
   */
  #ctx: HttpContext

  /**
   * Cookie configuration options
   */
  #config: Partial<CookieOptions>

  /**
   * Creates a new cookie store instance
   *
   * @param config - Cookie configuration options
   * @param ctx - HTTP context
   */
  constructor(config: Partial<CookieOptions>, ctx: HttpContext) {
    this.#config = config
    this.#ctx = ctx
    debug('initiating cookie store %O', this.#config)
  }

  /**
   * Reads session value from the encrypted cookie
   *
   * @param sessionId - Session identifier used as cookie name
   *
   * @example
   * const data = store.read('sess_abc123')
   */
  read(sessionId: string): SessionData | null {
    debug('cookie store: reading session data %s', sessionId)

    const cookieValue = this.#ctx.request.encryptedCookie(sessionId)
    if (typeof cookieValue !== 'object') {
      return null
    }

    return cookieValue
  }

  /**
   * Writes session values to an encrypted cookie
   *
   * @param sessionId - Session identifier used as cookie name
   * @param values - Session data to store
   *
   * @example
   * store.write('sess_abc123', { userId: 123, theme: 'dark' })
   */
  write(sessionId: string, values: SessionData): void {
    debug('cookie store: writing session data %s: %O', sessionId, values)
    this.#ctx.response.encryptedCookie(sessionId, values, this.#config)
  }

  /**
   * Removes the session cookie from the client
   *
   * @param sessionId - Session identifier used as cookie name
   *
   * @example
   * store.destroy('sess_abc123')
   */
  destroy(sessionId: string): void {
    debug('cookie store: destroying session data %s', sessionId)
    if (this.#ctx.request.cookiesList()[sessionId]) {
      this.#ctx.response.clearCookie(sessionId)
    }
  }

  /**
   * Updates the cookie expiry by rewriting it with existing values
   *
   * @param sessionId - Session identifier used as cookie name
   *
   * @example
   * store.touch('sess_abc123') // Refreshes cookie expiry
   */
  touch(sessionId: string): void {
    const value = this.read(sessionId)
    debug('cookie store: touching session data %s', sessionId)
    if (!value) {
      return
    }

    this.write(sessionId, value)
  }
}
