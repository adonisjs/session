/*
* @adonisjs/redis
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/session.ts" />

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { SessionDriverContract, SessionConfigContract } from '@ioc:Adonis/Addons/Session'

/**
 * Cookie driver utilizes the HTTP cookies to write session value. You must
 * not use this driver, if your session storage needs of severals megabytes,
 * since browsers have inbuilt limitations for cookie size.
 */
export class CookieDriver implements SessionDriverContract {
  constructor (
    private config: SessionConfigContract,
    private ctx: HttpContextContract,
  ) {}

  /**
   * Read session value from the cookie
   */
  public read (sessionId: string): string {
    const cookieValue = this.ctx.request.cookie(sessionId)
    return cookieValue || ''
  }

  /**
   * Write session values to the cookie
   */
  public write (sessionId: string, value: string): void {
    this.ctx.response.cookie(sessionId, value, this.config.cookie)
  }

  /**
   * Removes the session cookie
   */
  public destroy (sessionId: string): void {
    this.ctx.response.clearCookie(sessionId)
  }

  /**
   * Updates the cookie with existing cookie values
   */
  public touch (sessionId: string): void {
    const value = this.read(sessionId)
    this.write(sessionId, value)
  }
}
