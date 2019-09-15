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
    private _config: SessionConfigContract,
    private _ctx: HttpContextContract,
  ) {}

  /**
   * Read session value from the cookie
   */
  public async read (sessionId: string): Promise<string> {
    const cookieValue = this._ctx.request.cookie(sessionId)
    return cookieValue || ''
  }

  /**
   * Write session values to the cookie
   */
  public async write (sessionId: string, value: string): Promise<void> {
    this._ctx.response.cookie(sessionId, value, this._config.cookie)
  }

  /**
   * Removes the session cookie
   */
  public async destroy (sessionId: string) {
    this._ctx.response.clearCookie(sessionId)
  }

  /**
   * Updates the cookie with existing cookie values
   */
  public async touch (sessionId: string) {
    const value = await this.read(sessionId)
    await this.write(sessionId, value)
  }
}
