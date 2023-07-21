/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionConfig, SessionDriverContract, AllowedSessionValues } from './types.js'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@poppinss/utils'
import lodash from '@poppinss/utils/lodash'
import { cuid } from '@adonisjs/core/helpers'

import { Store } from './store.js'

/**
 * Session class exposes the API to read/write values to the session for
 * a given request.
 */
export class Session {
  /**
   * Session id for the current request. It will be different
   * from the "this.sessionId" when regenerate is called.
   */
  #currentSessionId: string

  /**
   * A instance of store with values read from the driver. The store
   * in initiated inside the [[initiate]] method
   */
  #store!: Store

  /**
   * Whether or not to re-generate the session id before committing
   * session values.
   */
  #regeneratedSessionId = false

  /**
   * Session key for setting flash messages
   */
  #flashMessagesKey = '__flash__'

  /**
   * The HTTP context for the current request.
   */
  #ctx: HttpContext

  /**
   * Configuration for the session
   */
  #config: SessionConfig

  /**
   * The session driver instance used to read and write session data.
   */
  #driver: SessionDriverContract

  /**
   * Set to true inside the `initiate` method
   */
  initiated = false

  /**
   * A boolean to know if it's a fresh session or not. Fresh
   * sessions are those, whose session id is not present
   * in cookie
   */
  fresh = false

  /**
   * A boolean to know if store is initiated in readonly mode
   * or not. This is done during Websocket requests
   */
  readonly = false

  /**
   * Session id for the given request. A new session id is only
   * generated when the cookie for the session id is missing
   */
  sessionId: string

  /**
   * A copy of previously set flash messages
   */
  flashMessages = new Store({})

  /**
   * A copy of flash messages. The `input` messages
   * are overwritten when any of the input related
   * methods are used.
   *
   * The `others` object is expanded with each call.
   */
  responseFlashMessages = new Store({})

  constructor(ctx: HttpContext, config: SessionConfig, driver: SessionDriverContract) {
    this.#ctx = ctx
    this.#config = config
    this.#driver = driver

    this.sessionId = this.#getSessionId()
    this.#currentSessionId = this.sessionId
  }

  /**
   * Returns a merged copy of flash messages or null
   * when nothing is set
   */
  #setFlashMessages(): void {
    if (this.responseFlashMessages.isEmpty) {
      return
    }

    const { input, ...others } = this.responseFlashMessages.all()
    this.put(this.#flashMessagesKey, { ...input, ...others })
  }

  /**
   * Returns the existing session id or creates one.
   */
  #getSessionId(): string {
    const sessionId = this.#ctx.request.cookie(this.#config.cookieName)
    if (sessionId) {
      return sessionId
    }

    this.fresh = true
    return cuid()
  }

  /**
   * Ensures the session store is initialized
   */
  #ensureIsReady(): void {
    if (!this.initiated) {
      throw new Exception(
        'Session store is not initiated yet. Make sure you are using the session hook',
        { code: 'E_RUNTIME_EXCEPTION', status: 500 }
      )
    }
  }

  /**
   * Raises exception when session store is in readonly mode
   */
  #ensureIsMutable() {
    if (this.readonly) {
      throw new Exception('Session store is in readonly mode and cannot be mutated', {
        status: 500,
        code: 'E_RUNTIME_EXCEPTION',
      })
    }
  }

  /**
   * Touches the session cookie
   */
  #touchSessionCookie(): void {
    this.#ctx.logger.trace('touching session cookie')
    this.#ctx.response.cookie(this.#config.cookieName, this.sessionId, this.#config.cookie!)
  }

  /**
   * Commits the session value to the store
   */
  async #commitValuesToStore(): Promise<void> {
    this.#ctx.logger.trace('persist session store with driver')
    await this.#driver.write(this.sessionId, this.#store.toJSON())
  }

  /**
   * Touches the driver to make sure the session values doesn't expire
   */
  async #touchDriver(): Promise<void> {
    this.#ctx.logger.trace('touch driver for liveliness')
    await this.#driver.touch(this.sessionId)
  }

  /**
   * Reading flash messages from the last HTTP request and
   * updating the flash messages bag
   */
  #readLastRequestFlashMessage() {
    if (this.readonly) {
      return
    }

    this.flashMessages.update(this.pull(this.#flashMessagesKey, null))
  }

  /**
   * Share flash messages & read only session's functions with views
   * (only when view property exists)
   */
  #shareLocalsWithView() {
    if (!this.#ctx['view'] || typeof this.#ctx['view'].share !== 'function') {
      return
    }

    this.#ctx['view'].share({
      flashMessages: this.flashMessages,
      session: {
        get: this.get.bind(this),
        has: this.has.bind(this),
        all: this.all.bind(this),
      },
    })
  }

  /**
   * Initiating the session by reading it's value from the
   * driver and feeding it to a store.
   *
   * Multiple calls to `initiate` results in a noop.
   */
  async initiate(readonly: boolean): Promise<void> {
    if (this.initiated) {
      return
    }

    this.readonly = readonly

    const contents = await this.#driver.read(this.sessionId)
    this.#store = new Store(contents)

    this.initiated = true
    this.#readLastRequestFlashMessage()
    this.#shareLocalsWithView()
  }

  /**
   * Re-generates the session id. This can is used to avoid
   * session fixation attacks.
   */
  regenerate(): void {
    this.#ctx.logger.trace('explicitly re-generating session id')
    this.sessionId = cuid()
    this.#regeneratedSessionId = true
  }

  /**
   * Set/update session value
   */
  put(key: string, value: AllowedSessionValues): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.#store.set(key, value)
  }

  /**
   * Find if the value exists in the session
   */
  has(key: string): boolean {
    this.#ensureIsReady()
    return this.#store.has(key)
  }

  /**
   * Get value from the session. The default value is returned
   * when actual value is `undefined`
   */
  get(key: string, defaultValue?: any): any {
    this.#ensureIsReady()
    return this.#store.get(key, defaultValue)
  }

  /**
   * Returns everything from the session
   */
  all(): any {
    this.#ensureIsReady()
    return this.#store.all()
  }

  /**
   * Remove value for a given key from the session
   */
  forget(key: string): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.#store.unset(key)
  }

  /**
   * The method is equivalent to calling `session.get` followed
   * by `session.forget`
   */
  pull(key: string, defaultValue?: any): any {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    return this.#store.pull(key, defaultValue)
  }

  /**
   * Increment value for a number inside the session store. The
   * method raises an error when underlying value is not
   * a number
   */
  increment(key: string, steps: number = 1): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.#store.increment(key, steps)
  }

  /**
   * Decrement value for a number inside the session store. The
   * method raises an error when underlying value is not
   * a number
   */
  decrement(key: string, steps: number = 1): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.#store.decrement(key, steps)
  }

  /**
   * Remove everything from the session
   */
  clear(): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.#store.clear()
  }

  /**
   * Add a new flash message
   */
  flash(key: string | { [key: string]: AllowedSessionValues }, value?: AllowedSessionValues): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()

    /**
     * Update value
     */
    if (typeof key === 'string') {
      if (value) {
        this.responseFlashMessages.set(key, value)
      }
    } else {
      this.responseFlashMessages.merge(key)
    }
  }

  /**
   * Flash all form values
   */
  flashAll(): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.responseFlashMessages.set('input', this.#ctx.request.original())
  }

  /**
   * Flash all form values except mentioned keys
   */
  flashExcept(keys: string[]): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.responseFlashMessages.set('input', lodash.omit(this.#ctx.request.original(), keys))
  }

  /**
   * Flash only defined keys from the form values
   */
  flashOnly(keys: string[]): void {
    this.#ensureIsReady()
    this.#ensureIsMutable()
    this.responseFlashMessages.set('input', lodash.pick(this.#ctx.request.original(), keys))
  }

  /**
   * Reflash existing flash messages
   */
  reflash() {
    this.flash(this.flashMessages.all())
  }

  /**
   * Reflash selected keys from the existing flash messages
   */
  reflashOnly(keys: string[]) {
    this.flash(lodash.pick(this.flashMessages.all(), keys))
  }

  /**
   * Omit selected keys from the existing flash messages
   * and flash the rest of values
   */
  reflashExcept(keys: string[]) {
    this.flash(lodash.omit(this.flashMessages.all(), keys))
  }

  /**
   * Writes value to the underlying session driver.
   */
  async commit(): Promise<void> {
    if (!this.initiated) {
      console.log('session not initiated')
      this.#touchSessionCookie()
      await this.#touchDriver()
      return
    }

    /**
     * Cleanup old session and re-generate new session
     */
    if (this.#regeneratedSessionId) {
      await this.#driver.destroy(this.#currentSessionId)
    }

    /**
     * Touch the session cookie to keep it alive.
     */
    this.#touchSessionCookie()
    this.#setFlashMessages()
    await this.#commitValuesToStore()
  }
}
