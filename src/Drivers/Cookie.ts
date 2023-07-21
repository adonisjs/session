/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { SessionConfig, SessionDriverContract } from '../types.js'

/**
 * Cookie driver utilizes the encrypted HTTP cookies to write session value.
 */
export class CookieDriver implements SessionDriverContract {
  #config: SessionConfig
  #ctx: HttpContext

  constructor(config: SessionConfig, ctx: HttpContext) {
    this.#config = config
    this.#ctx = ctx
  }

  /**
   * Read session value from the cookie
   */
  read(sessionId: string): { [key: string]: any } | null {
    const cookieValue = this.#ctx.request.encryptedCookie(sessionId)
    if (typeof cookieValue !== 'object') {
      return null
    }
    return cookieValue
  }

  /**
   * Write session values to the cookie
   */
  write(sessionId: string, values: { [key: string]: any }): void {
    if (typeof values !== 'object') {
      throw new Error('Session cookie driver expects an object of values')
    }

    this.#ctx.response.encryptedCookie(sessionId, values, this.#config.cookie)
  }

  /**
   * Removes the session cookie
   */
  destroy(sessionId: string): void {
    if (this.#ctx.request.cookiesList()[sessionId]) {
      this.#ctx.response.clearCookie(sessionId)
    }
  }

  /**
   * Updates the cookie with existing cookie values
   */
  touch(sessionId: string): void {
    const value = this.read(sessionId)
    if (!value) {
      return
    }

    this.write(sessionId, value)
  }
}
