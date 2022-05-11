/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/Session' {
  import { CookieOptions } from '@ioc:Adonis/Core/Response'
  import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
  import { ApplicationContract } from '@ioc:Adonis/Core/Application'

  /**
   * Shape of session config.
   */
  export interface SessionConfig {
    /**
     * Enable/disable session for the entire application lifecycle
     */
    enabled: boolean

    /**
     * The driver in play
     */
    driver: string

    /**
     * Cookie name.
     */
    cookieName: string

    /**
     * Clear session when browser closes
     */
    clearWithBrowser: boolean

    /**
     * Age of session cookie
     */
    age: string | number

    /**
     * Config for the cookie driver and also the session id
     * cookie
     */
    cookie: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>

    /**
     * Config for the file driver
     */
    file?: {
      location: string
    }

    /**
     * The redis connection to use from the `config/redis` file
     */
    redisConnection?: string
  }

  /**
   * Shape of a driver that every session driver must have
   */
  export interface SessionDriverContract {
    read(sessionId: string): Promise<Record<string, any> | null> | Record<string, any> | null
    write(sessionId: string, values: Record<string, any>): Promise<void> | void
    destroy(sessionId: string): Promise<void> | void
    touch(sessionId: string): Promise<void> | void
  }

  /**
   * The callback to be passed to the `extend` method. It is invoked
   * for each request (if extended driver is in use).
   */
  export type ExtendCallback = (
    manager: SessionManagerContract,
    config: SessionConfig,
    ctx: HttpContextContract
  ) => SessionDriverContract

  /**
   * The values allowed by the `session.put` method
   */
  export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>

  /**
   * Store used for storing session values + flash messages
   */
  export interface StoreContract {
    /**
     * A boolean to know if store is empty
     */
    isEmpty: boolean

    /**
     * Set value for a key
     */
    set(key: string, value: AllowedSessionValues): void

    /**
     * Increment value for a key. An exception is raised when existing
     * value is not a number
     */
    increment(key: string, steps?: number): void

    /**
     * Decrement value for a key. An exception is raised when existing
     * value is not a number
     */
    decrement(key: string, steps?: number): void

    /**
     * Replace existing values with new ones
     */
    update(values: Record<string, any>): void

    /**
     * Merge values with existing ones
     */
    merge(values: Record<string, any>): any

    /**
     * Get all values
     */
    all(): any

    /**
     * Get value for a given key or use the default value
     */
    get(key: string, defaultValue?: any): any

    /**
     * Find if a value exists. Optionally you can also check arrays
     * to have length too
     */
    has(key: string, checkForArraysLength?: boolean): boolean

    /**
     * Unset value
     */
    unset(key: string): void

    /**
     * Clear all values
     */
    clear(): void

    /**
     * Read value and then unset it at the same time
     */
    pull(key: string, defaultValue?: any): any

    /**
     * Convert store values toObject
     */
    toObject(): any

    /**
     * Convert store values to toJSON
     */
    toJSON(): any
  }

  /**
   * Shape of the actual session store
   */
  export interface SessionContract {
    /**
     * Has the store being initiated
     */
    initiated: boolean

    /**
     * Is session store readonly. Will be during Websockets
     * request
     */
    readonly: boolean

    /**
     * Is session just created or we read received the
     * session id from the request
     */
    fresh: boolean

    /**
     * Session id
     */
    sessionId: string

    /**
     * Previous request flash messages
     */
    flashMessages: StoreContract

    /**
     * Flash messages that will be sent in the current
     * request response
     */
    responseFlashMessages: StoreContract

    /**
     * Initiate session store
     */
    initiate(readonly: boolean): Promise<void>

    /**
     * Commit session mutations
     */
    commit(): Promise<void>

    /**
     * Re-generate session id. This help avoid session
     * replay attacks.
     */
    regenerate(): void

    /**
     * Store API
     */
    has(key: string): boolean
    put(key: string, value: AllowedSessionValues): void
    get(key: string, defaultValue?: any): any
    all(): any
    forget(key: string): void
    pull(key: string, defaultValue?: any): any
    increment(key: string, steps?: number): any
    decrement(key: string, steps?: number): any
    clear(): void

    /**
     * Flash a key-value pair
     */
    flash(values: { [key: string]: AllowedSessionValues }): void
    flash(key: string, value: AllowedSessionValues): void

    /**
     * Flash request body
     */
    flashAll(): void

    /**
     * Flash selected keys from the request body
     */
    flashOnly(keys: string[]): void

    /**
     * Omit selected keys from the request data and flash
     * the rest of values
     */
    flashExcept(keys: string[]): void

    /**
     * Reflash existing flash messages
     */
    reflash(): void

    /**
     * Reflash selected keys from the existing flash messages
     */
    reflashOnly(keys: string[]): void

    /**
     * Omit selected keys from the existing flash messages
     * and flash the rest of values
     */
    reflashExcept(keys: string[]): void
  }

  /**
   * SessionClient exposes the API to set session data as a client
   */
  export interface SessionClientContract extends StoreContract {
    /**
     * Find if the sessions are enabled
     */
    isEnabled(): boolean

    /**
     * Flash messages store to set flash messages
     */
    flashMessages: StoreContract

    /**
     * Load session data from the driver
     */
    load(cookies: Record<string, any>): Promise<{
      session: Record<string, any>
      flashMessages: Record<string, any> | null
    }>

    /**
     * Commits the session data to the session store and returns
     * the session id and cookie name for it to be accessible
     * by the server
     */
    commit(): Promise<{ cookieName: string; sessionId: string; signedSessionId: string }>

    /**
     * Forget the session data.
     */
    forget(): Promise<void>
  }

  /**
   * Session manager shape
   */
  export interface SessionManagerContract {
    isEnabled(): boolean
    application: ApplicationContract
    client(): SessionClientContract
    create(ctx: HttpContextContract): SessionContract
    extend(driver: string, callback: ExtendCallback): void
  }

  const Session: SessionManagerContract
  export default Session
}
