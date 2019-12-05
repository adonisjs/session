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
import { MessageBag } from '../MessageBag'

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
   * A copy of previously set flash messages
   */
  public flashMessages = new MessageBag({})

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

  /**
   * A copy of flash messages. The `input` messages
   * are overwritten when any of the input related
   * methods are used.
   *
   * The `others` object is expanded with each call.
   */
  private _flashMessagesStore: {
    input: any,
    others: any,
  } = {
    input: null,
    others: null,
  }

  private _flashMessagesKey = '__flash__'

  constructor (
    private _ctx: HttpContextContract,
    private _config: SessionConfigContract,
    private _driver: SessionDriverContract,
  ) {}

  /**
   * Returns a merged copy of flash messages or null
   * when nothing is set
   */
  private _setFlashMessages (): void {
    if (
      this._flashMessagesStore.input === null &&
      this._flashMessagesStore.others === null
    ) {
      return
    }

    this.put(this._flashMessagesKey, {
      ...this._flashMessagesStore.input,
      ...this._flashMessagesStore.others,
    })
  }

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
  private _ensureIsReady (): void {
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
  private _touchSessionCookie (): void {
    this._ctx
      .response
      .cookie(this._config.cookieName, this.sessionId, this._config.cookie!)
  }

  /**
   * Commits the session value to the store
   */
  private async _commitValuesToStore (value: string): Promise<void> {
    /**
     * Delete the session values from the driver when it is empty. This
     * results in saving lots of space when the sessions are not used
     * but initialized in an application.
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
  private async _touchStore (): Promise<void> {
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

      /**
       * Pull flash messages set by the last request
       */
      this.flashMessages.update(this.pull(this._flashMessagesKey, null))

      /**
       * Share flash messages with views (only when view property exists)
       */
      if (this._ctx['view']) {
        this._ctx['view'].share({ flashMessages: this.flashMessages })
      }

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
  public regenerate (): void {
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
    return ((value): any => {
      this.forget(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Increment value for a number inside the session store. The
   * method raises an error when underlying value is not
   * a string
   */
  public increment (key: string, steps: number = 1): void {
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
  public decrement (key: string, steps: number = 1): void {
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
   * Add a new flash message
   */
  public flash (key: string, value: AllowedSessionValues): void {
    this._ensureIsReady()
    if (this._flashMessagesStore.others === null) {
      this._flashMessagesStore.others = {}
    }

    this._flashMessagesStore.others[key] = value
  }

  /**
   * Flash all form values
   */
  public flashAll (): void {
    this._ensureIsReady()
    this._flashMessagesStore.input = this._ctx.request.all()
  }

  /**
   * Flash all form values except mentioned keys
   */
  public flashExcept (keys: string[]): void {
    this._ensureIsReady()
    this._flashMessagesStore.input = this._ctx.request.except(keys)
  }

  /**
   * Flash only defined keys from the form values
   */
  public flashOnly (keys: string[]): void {
    this._ensureIsReady()
    this._flashMessagesStore.input = this._ctx.request.only(keys)
  }

  /**
   * Writes value to the underlying session driver.
   */
  public async commit (): Promise<void> {
    const action = this._ctx.profiler.profile('session:commit', {
      driver: this._config.driver,
    })

    try {
      /**
       * Cleanup old session and re-generate new session
       */
      if (this._regenerate) {
        await this._driver.destroy(this.sessionId)
        this.sessionId = uuid.v4()
      }

      /**
       * Touch the session cookie to keep it alive.
       */
      this._touchSessionCookie()

      if (this.initiated) {
        this._setFlashMessages()
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
