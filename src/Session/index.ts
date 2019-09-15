/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/session.ts" />

import uuid from 'uuid'
import { Exception } from '@poppinss/utils'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import {
  SessionContract,
  SessionConfigContract,
  SessionDriverContract,
  AllowedSessionValues,
} from '@ioc:Adonis/Addons/Session'

import { Store } from '../Store'

/**
 * Session class exposes the API to read/write values to the session for
 * a given request.
 */
export class Session implements SessionContract {
  /**
   * Set to true inside the `initiate` method
   */
  public initiated = false

  /**
   * A boolean to know if it's a fresh session or not. Fresh
   * sessions are those, whose session id is not present
   * in cookie
   */
  public fresh = false

  /**
   * A boolean to know if store is initiated in readonly mode
   * or not. This is done during Websocket requests
   */
  public readonly = false

  /**
   * Session id for the given request. A new session id is only
   * generated when the cookie for the session id is missing
   */
  public sessionId = this._getSessionId()

  /**
   * A instance of store with values read from the driver. The store
   * in initiated inside the [[initiate]] method
   */
  private _store: Store

  /**
   * Whether or not to re-generate the session id before comitting
   * session values.
   */
  private _regenerate = false

  constructor (
    private _ctx: HttpContextContract,
    private _config: SessionConfigContract,
    private _driver: SessionDriverContract,
  ) {}

  /**
   * Returns the existing session id or creates one.
   */
  private _getSessionId (): string {
    const sessionId = this._ctx.request.cookie(this._config.cookieName)
    if (sessionId) {
      return sessionId
    }

    this.fresh = true
    return uuid.v4()
  }

  /**
   * Ensures the session is ready for mutations
   */
  private _ensureIsReady () {
    if (!this.initiated) {
      throw new Exception(
        'Session store is not initiated yet. Make sure you are using the session hook',
        500,
        'E_RUNTIME_EXCEPTION',
      )
    }

    if (this.readonly) {
      throw new Exception(
        'Session store is in readonly mode and cannot be mutated',
        500,
        'E_RUNTIME_EXCEPTION',
      )
    }
  }

  /**
   * Touches the session cookie
   */
  private _touchSessionCookie () {
    this._ctx.response.cookie(this._config.cookieName, this.sessionId, this._config.cookie!)
  }

  /**
   * Commits the session value to the store
   */
  private async _commitValuesToStore (value: string) {
    /**
     * Delete the session values from the driver when it is empty. This results in
     * saving lots of space when the sessions are not used but initialized in
     * an application.
     */
    if (value === '{}') {
      await this._driver.destroy(this.sessionId)
      return
    }

    await this._driver.write(this.sessionId, value)
  }

  /**
   * Touches the store to make sure the session doesn't expire
   */
  private async _touchStore () {
    await this._driver.touch(this.sessionId)
  }

  /**
   * Initiating the session by reading it's value from the
   * driver and feeding it to a store.
   *
   * Multiple calls to `initiate` results in a noop.
   */
  public async initiate (readonly: boolean): Promise<void> {
    if (this.initiated) {
      return
    }

    this.initiated = true
    this.readonly = readonly

    const action = this._ctx.profiler.profile('session:initiate', { driver: this._config.driver })

    try {
      const contents = await this._driver.read(this.sessionId)
      this._store = new Store(contents)
      action.end()
    } catch (error) {
      action.end({ error })
      throw error
    }
  }

  /**
   * Re-generates the session id. This can is used to avoid
   * session fixation attacks.
   */
  public regenerate () {
    this._regenerate = true
  }

  /**
   * Set/update session value
   */
  public put (key: string, value: AllowedSessionValues): void {
    this._ensureIsReady()
    this._store.set(key, value)
  }

  /**
   * Get value from the session. The default value is returned
   * when actual value is `undefined`
   */
  public get (key: string, defaultValue?: any): any {
    this._ensureIsReady()
    return this._store.get(key, defaultValue)
  }

  /**
   * Returns everything from the session
   */
  public all (): any {
    this._ensureIsReady()
    return this._store.all()
  }

  /**
   * Remove value for a given key from the session
   */
  public forget (key: string): void {
    this._ensureIsReady()
    this._store.unset(key)
  }

  /**
   * The method is equivalent to calling `session.get` followed
   * by `session.forget`
   */
  public pull (key: string, defaultValue?: any): any {
    return ((value) => {
      this.forget(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Increment value for a number inside the session store. The
   * method raises an error when underlying value is not
   * a string
   */
  public increment (key: string, steps: number = 1): any {
    this._ensureIsReady()

    const value = this._store.get(key, 0)
    if (typeof (value) !== 'number') {
      throw new Exception(`Cannot increment ${key}, since original value is not a number`)
    }

    this._store.set(key, value + steps)
  }

  /**
   * Decrement value for a number inside the session store. The
   * method raises an error when underlying value is not
   * a string
   */
  public decrement (key: string, steps: number = 1): any {
    this._ensureIsReady()

    const value = this._store.get(key, 0)
    if (typeof (value) !== 'number') {
      throw new Exception(`Cannot decrement ${key}, since original value is not a number`)
    }

    this._store.set(key, value - steps)
  }

  /**
   * Remove everything from the session
   */
  public clear (): void {
    this._ensureIsReady()
    this._store.clear()
  }

  /**
   * Writes value to the underlying session driver.
   */
  public async commit () {
    const action = this._ctx.profiler.profile('session:commit', { driver: this._config.driver })

    try {
      /**
       * Cleanup old session and re-generate new session
       */
      if (this._regenerate) {
        await this._driver.destroy(this.sessionId)
        this.sessionId = uuid.v4()
      }

      /**
       * Update the cookie value
       */
      this._touchSessionCookie()

      if (this.initiated) {
        await this._commitValuesToStore(this._store.toString())
      } else {
        await this._touchStore()
      }

      action.end()
    } catch (error) {
      action.end({ error })
      throw error
    }
  }
}
