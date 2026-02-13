/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto'
import type { I18n } from '@adonisjs/i18n'
import Macroable from '@poppinss/macroable'
import lodash from '@poppinss/utils/lodash'
import type { HttpContext } from '@adonisjs/core/http'
import type { EmitterService } from '@adonisjs/core/types'
import type { HttpError } from '@adonisjs/core/types/http'

import debug from './debug.ts'
import * as errors from './errors.ts'
import { ReadOnlyValuesStore, ValuesStore } from './values_store.ts'
import type {
  SessionData,
  SessionConfig,
  SessionStoreFactory,
  AllowedSessionValues,
  SessionStoreContract,
  SessionStoreWithTaggingContract,
} from './types.ts'
import is from '@adonisjs/core/helpers/is'
const STORE_IN_FLASH = Symbol.for('store_in_flash')

/**
 * The session class exposes the API to read and write values to
 * the session store.
 *
 * A session instance is isolated between requests but
 * uses a centralized persistence store.
 *
 * @example
 * // Creating and using a session
 * const session = new Session(config, storeFactory, emitter, ctx)
 * await session.initiate(false)
 *
 * session.put('username', 'john')
 * const username = session.get('username')
 *
 * await session.commit()
 */
export class Session extends Macroable {
  #store: SessionStoreContract | SessionStoreWithTaggingContract
  #emitter: EmitterService
  #ctx: HttpContext
  #readonly: boolean = false

  /**
   * Session values store that holds the actual session data
   */
  #valuesStore?: ValuesStore

  /**
   * Session id that will be committed as a cookie during the response
   */
  #sessionId: string

  /**
   * Session id read from the cookie during the HTTP request.
   * May not exist during the first request or will differ from sessionId during regeneration.
   */
  #sessionIdFromCookie?: string

  /**
   * Store of flash messages that will be written during the HTTP request
   */
  responseFlashMessages = new ValuesStore({})

  /**
   * Store of flash messages for the current HTTP request
   */
  flashMessages = new ValuesStore({})

  /**
   * The key used for storing flash messages inside the session store
   */
  flashKey: string = '__flash__'

  /**
   * Gets the session id for the current HTTP request
   */
  get sessionId() {
    return this.#sessionId
  }

  /**
   * Returns true if a fresh session was created during the request
   */
  get fresh(): boolean {
    return this.#sessionIdFromCookie === undefined
  }

  /**
   * Returns true if the session is in readonly state
   */
  get readonly() {
    return this.#readonly
  }

  /**
   * Returns true if the session store has been initiated
   */
  get initiated() {
    return !!this.#valuesStore
  }

  /**
   * Returns true if the session id has been re-generated during the current request
   */
  get hasRegeneratedSession() {
    return !!(this.#sessionIdFromCookie && this.#sessionIdFromCookie !== this.#sessionId)
  }

  /**
   * Returns true if the session store is empty
   */
  get isEmpty() {
    return this.#valuesStore?.isEmpty ?? true
  }

  /**
   * Returns true if the session store has been modified
   */
  get hasBeenModified() {
    return this.#valuesStore?.hasBeenModified ?? false
  }

  /**
   * Creates a new session instance
   *
   * @param config - Session configuration
   * @param storeFactory - Factory function to create session store
   * @param emitter - Event emitter service
   * @param ctx - HTTP context
   */
  constructor(
    public config: SessionConfig,
    storeFactory: SessionStoreFactory,
    emitter: EmitterService,
    ctx: HttpContext
  ) {
    super()
    this.#ctx = ctx
    this.#emitter = emitter
    this.#store = storeFactory(ctx, config)
    this.#sessionIdFromCookie = ctx.request.cookie(config.cookieName, undefined)
    this.#sessionId = this.#sessionIdFromCookie || randomUUID()
  }

  /**
   * Returns the flash messages store for a given mode
   *
   * @param mode - Access mode ('write' or 'read')
   */
  #getFlashStore(mode: 'write' | 'read'): ValuesStore {
    if (!this.#valuesStore) {
      throw new errors.E_SESSION_NOT_READY()
    }

    if (mode === 'write' && this.readonly) {
      throw new errors.E_SESSION_NOT_MUTABLE()
    }

    return this.responseFlashMessages
  }

  /**
   * Determines whether a value should be stored in flash messages.
   * Objects can opt out by setting a STORE_IN_FLASH symbol property to false.
   *
   * @param value - Value to check for flash storage eligibility
   */
  protected shouldFlashValue(value: unknown) {
    if (value && typeof value === 'object') {
      return STORE_IN_FLASH in value ? value[STORE_IN_FLASH] : true
    }
    return true
  }

  /**
   * Filters flash data to only include values that should be flashed.
   * Removes values that have opted out of flash storage.
   *
   * @param data - Flash data to filter
   */
  protected cleanupFlashData<T>(data: T): T | Record<string, any> {
    if (is.plainObject(data)) {
      return Object.keys(data).reduce<Record<string, any>>((result, key) => {
        const value = data[key]
        if (this.shouldFlashValue(value)) {
          result[key] = value
        }
        return result
      }, {})
    }
    return data
  }

  /**
   * Returns the store instance for a given mode
   *
   * @param mode - Access mode ('write' or 'read')
   */
  #getValuesStore(mode: 'write' | 'read'): ValuesStore {
    if (!this.#valuesStore) {
      throw new errors.E_SESSION_NOT_READY()
    }

    if (mode === 'write' && this.readonly) {
      throw new errors.E_SESSION_NOT_MUTABLE()
    }

    return this.#valuesStore
  }

  /**
   * Initiates the session store. The method results in a noop when called multiple times.
   *
   * @param readonly - Whether to initiate the session in readonly mode
   *
   * @example
   * await session.initiate(false) // Read-write mode
   * await session.initiate(true)  // Readonly mode
   */
  async initiate(readonly: boolean): Promise<void> {
    if (this.#valuesStore) {
      return
    }

    debug('initiating session (readonly: %s)', readonly)

    this.#readonly = readonly
    const contents = await this.#store.read(this.#sessionId)
    this.#valuesStore = new ValuesStore(contents)

    /**
     * Extract flash messages from the store and keep a local
     * copy of it.
     */
    if (this.has(this.flashKey)) {
      debug('reading flash data')
      if (this.#readonly) {
        this.flashMessages.update(this.get(this.flashKey, null))
      } else {
        this.flashMessages.update(this.pull(this.flashKey, null))
      }
    }

    /**
     * Share session with the templates. We assume the view property
     * is a reference to edge templates
     */
    if ('view' in this.#ctx) {
      this.#ctx.view.share({
        session: new ReadOnlyValuesStore(this.#valuesStore.all()),
        flashMessages: new ReadOnlyValuesStore(this.flashMessages.all()),
        old: function (key: string, defaultValue?: any) {
          return this.flashMessages.get(key, defaultValue)
        },
      })
    }

    this.#emitter.emit('session:initiated', { session: this })
  }

  /**
   * Puts a key-value pair to the session data store
   *
   * @param key - The key to store the value under
   * @param value - The value to store
   *
   * @example
   * session.put('username', 'john')
   * session.put('user.preferences', { theme: 'dark' })
   */
  put(key: string, value: AllowedSessionValues) {
    this.#getValuesStore('write').set(key, value)
  }

  /**
   * Checks if a key exists inside the datastore
   *
   * @param key - The key to check for existence
   *
   * @example
   * if (session.has('username')) {
   *   console.log('User is logged in')
   * }
   */
  has(key: string): boolean {
    return this.#getValuesStore('read').has(key)
  }

  /**
   * Gets the value of a key from the session datastore.
   * You can specify a default value to use when key does not exist or has undefined value.
   *
   * @param key - The key to retrieve
   * @param defaultValue - Default value to return if key doesn't exist
   *
   * @example
   * const username = session.get('username', 'guest')
   * const preferences = session.get('user.preferences', {})
   */
  get(key: string, defaultValue?: any) {
    return this.#getValuesStore('read').get(key, defaultValue)
  }

  /**
   * Gets everything from the session store
   *
   * @example
   * const allData = session.all()
   * console.log(allData) // { username: 'john', theme: 'dark' }
   */
  all() {
    return this.#getValuesStore('read').all()
  }

  /**
   * Removes a key from the session datastore
   *
   * @param key - The key to remove
   *
   * @example
   * session.forget('temp_data')
   * session.forget('user.cache')
   */
  forget(key: string) {
    return this.#getValuesStore('write').unset(key)
  }

  /**
   * Reads value for a key from the session datastore and removes it simultaneously
   *
   * @param key - The key to pull
   * @param defaultValue - Default value to return if key doesn't exist
   *
   * @example
   * const message = session.pull('notification', 'No messages')
   * // message contains the value, and it's removed from session
   */
  pull(key: string, defaultValue?: any) {
    return this.#getValuesStore('write').pull(key, defaultValue)
  }

  /**
   * Increments the value of a key inside the session store.
   * A new key will be defined if it doesn't exist already with value 1.
   *
   * @param key - The key to increment
   * @param steps - Number of steps to increment (default: 1)
   *
   * @example
   * session.increment('page_views')     // Increments by 1
   * session.increment('score', 10)      // Increments by 10
   */
  increment(key: string, steps: number = 1) {
    return this.#getValuesStore('write').increment(key, steps)
  }

  /**
   * Decrements the value of a key inside the session store.
   * A new key will be defined if it doesn't exist already with value -1.
   *
   * @param key - The key to decrement
   * @param steps - Number of steps to decrement (default: 1)
   *
   * @example
   * session.decrement('attempts')       // Decrements by 1
   * session.decrement('credits', 5)     // Decrements by 5
   */
  decrement(key: string, steps: number = 1) {
    return this.#getValuesStore('write').decrement(key, steps)
  }

  /**
   * Empties the session store
   *
   * @example
   * session.clear() // Removes all session data
   */
  clear() {
    return this.#getValuesStore('write').clear()
  }

  /**
   * Adds a key-value pair to flash messages
   *
   * @param key - The key or object of key-value pairs to flash
   * @param value - The value to flash (when key is a string)
   *
   * @example
   * session.flash('success', 'Data saved successfully!')
   * session.flash({ error: 'Validation failed', info: 'Try again' })
   */
  flash(key: string, value: AllowedSessionValues): void
  flash(keyValue: SessionData): void
  flash(key: string | SessionData, value?: AllowedSessionValues): void {
    if (typeof key === 'string') {
      if (value && this.shouldFlashValue(value)) {
        this.#getFlashStore('write').set(key, value)
      }
    } else {
      this.#getFlashStore('write').merge(this.cleanupFlashData(key))
    }
  }

  /**
   * Flashes errors to the errorsBag. You can read these errors via the "@error" tag.
   * Appends new messages to the existing collection.
   *
   * @param errorsCollection - Collection of error messages
   *
   * @example
   * session.flashErrors({
   *   general: 'Something went wrong',
   *   validation: ['Name is required', 'Email is invalid']
   * })
   */
  flashErrors(errorsCollection: Record<string, string | string[]>) {
    this.flash({ errorsBag: errorsCollection })
  }

  /**
   * Flashes validation error messages. Make sure the error is an instance of VineJS ValidationException.
   * Overrides existing inputErrors.
   *
   * @param error - HTTP error containing validation messages
   *
   * @example
   * try {
   *   await request.validate(schema)
   * } catch (error) {
   *   session.flashValidationErrors(error)
   * }
   */
  flashValidationErrors(error: HttpError, withInput: boolean = true) {
    const errorsBag = error.messages.reduce((result: Record<string, string[]>, message: any) => {
      if (result[message.field]) {
        result[message.field].push(message.message)
      } else {
        result[message.field] = [message.message]
      }
      return result
    }, {})

    if (withInput) {
      this.flashExcept(['_csrf', '_method', 'password', 'password_confirmation'])
    }

    /**
     * Adding the error summary to the "errorsBag" so that
     * we display the validation error globally using
     * the "@error" tag.
     */
    let summary = 'The form could not be saved. Please check the errors below.'
    if ('i18n' in this.#ctx) {
      summary = (this.#ctx.i18n as I18n).t(
        `errors.${error.code}`,
        {
          count: error.messages.length,
        },
        summary
      )
    }

    this.flashErrors({
      [String(error.code)]: summary,
    })

    /**
     * Adding to inputErrorsBag for "@inputError" tag
     * to read validation errors
     */
    this.flash('inputErrorsBag', errorsBag)
  }

  /**
   * Flashes all form input data to the flash messages store
   *
   * @example
   * session.flashAll() // Flashes all request input for next request
   */
  flashAll() {
    let requestInput = this.#ctx.request.original()
    return this.#getFlashStore('write').set('input', this.cleanupFlashData(requestInput))
  }

  /**
   * Flashes form input data (except some keys) to the flash messages store
   *
   * @param keys - Array of keys to exclude from flashing
   *
   * @example
   * session.flashExcept(['password', '_csrf'])
   */
  flashExcept(keys: string[]): void {
    this.#getFlashStore('write').set(
      'input',
      lodash.omitBy(this.#ctx.request.original(), (value, key) => {
        if (keys.includes(key)) {
          return true
        }
        return !this.shouldFlashValue(value)
      })
    )
  }

  /**
   * Flashes form input data (only some keys) to the flash messages store
   *
   * @param keys - Array of keys to include in flashing
   *
   * @example
   * session.flashOnly(['name', 'email'])
   */
  flashOnly(keys: string[]): void {
    this.#getFlashStore('write').set(
      'input',
      lodash.pickBy(this.#ctx.request.original(), (value, key) => {
        if (keys.includes(key)) {
          return this.shouldFlashValue(value)
        }
        return false
      })
    )
  }

  /**
   * Reflashes messages from the last request in the current response
   *
   * @example
   * session.reflash() // Keep all flash messages for another request
   */
  reflash(): void {
    this.#getFlashStore('write').set('reflashed', this.flashMessages.all())
  }

  /**
   * Reflashes messages (only some keys) from the last request in the current response
   *
   * @param keys - Array of keys to reflash
   *
   * @example
   * session.reflashOnly(['success', 'info'])
   */
  reflashOnly(keys: string[]) {
    this.#getFlashStore('write').set('reflashed', lodash.pick(this.flashMessages.all(), keys))
  }

  /**
   * Reflashes messages (except some keys) from the last request in the current response
   *
   * @param keys - Array of keys to exclude from reflashing
   *
   * @example
   * session.reflashExcept(['error', 'warning'])
   */
  reflashExcept(keys: string[]) {
    this.#getFlashStore('write').set('reflashed', lodash.omit(this.flashMessages.all(), keys))
  }

  /**
   * Checks if the current store supports session tagging.
   * Only Memory, Redis, and Database stores support tagging.
   *
   * @example
   * if (session.supportsTagging()) {
   *   await session.tag(String(user.id))
   * }
   */
  supportsTagging(): boolean {
    return 'tag' in this.#store && 'tagged' in this.#store
  }

  /**
   * Tag the current session with a user ID.
   * Only supported by Memory, Redis, and Database stores.
   * This enables features like "logout from all devices".
   *
   * @param userId - The user ID to tag this session with
   *
   * @example
   * // During login, tag the session with the user's ID
   * await session.tag(String(user.id))
   */
  async tag(userId: string): Promise<void> {
    if (!('tag' in this.#store)) {
      throw new errors.E_SESSION_TAGGING_NOT_SUPPORTED()
    }
    await this.#store.tag(this.#sessionId, userId)
  }

  /**
   * Removes the tag association between this session and a user ID.
   * Only supported by Memory, Redis, and Database stores.
   *
   * @param userId - The user ID to untag this session from
   *
   * @example
   * // During logout, untag the session
   * await session.untag(String(user.id))
   */
  async untag(userId: string): Promise<void> {
    if (!('tag' in this.#store)) {
      throw new errors.E_SESSION_TAGGING_NOT_SUPPORTED()
    }
    await this.#store.untag(this.#sessionId, userId)
  }

  /**
   * Re-generates the session id and migrates data to it
   *
   * @example
   * session.regenerate() // Generates new session ID for security
   */
  regenerate() {
    this.#sessionId = randomUUID()
  }

  /**
   * Commits session changes. No more mutations will be allowed after commit.
   *
   * @example
   * await session.commit() // Save all changes to the session store
   */
  async commit() {
    if (!this.#valuesStore || this.readonly) {
      return
    }

    /**
     * If the flash messages store is not empty, we should put
     * its messages inside main session store.
     */
    if (!this.responseFlashMessages.isEmpty) {
      const { input, reflashed, ...others } = this.responseFlashMessages.all()
      this.put(this.flashKey, { ...reflashed, ...input, ...others })
    }

    debug('committing session data')

    /**
     * Touch the session id cookie to stay alive
     */
    this.#ctx.response.cookie(this.config.cookieName, this.#sessionId, this.config.cookie!)

    /**
     * Delete the session data when the session store
     * is empty.
     *
     * Also we only destroy the session id we read from the cookie.
     * If there was no session id in the cookie, there won't be
     * any data inside the store either.
     */
    if (this.isEmpty) {
      if (this.#sessionIdFromCookie) {
        await this.#store.destroy(this.#sessionIdFromCookie)
      }
      this.#emitter.emit('session:committed', { session: this })
      return
    }

    /**
     * Touch the store expiry when the session store was
     * not modified.
     */
    if (!this.hasBeenModified) {
      if (this.#sessionIdFromCookie && this.#sessionIdFromCookie !== this.#sessionId) {
        await this.#store.destroy(this.#sessionIdFromCookie)
        await this.#store.write(this.#sessionId, this.#valuesStore.toJSON())
        this.#emitter.emit('session:migrated', {
          fromSessionId: this.#sessionIdFromCookie,
          toSessionId: this.sessionId,
          session: this,
        })
      } else {
        await this.#store.touch(this.#sessionId)
      }
      this.#emitter.emit('session:committed', { session: this })
      return
    }

    /**
     * Otherwise commit to the session store
     */
    if (this.#sessionIdFromCookie && this.#sessionIdFromCookie !== this.#sessionId) {
      await this.#store.destroy(this.#sessionIdFromCookie)
      await this.#store.write(this.#sessionId, this.#valuesStore.toJSON())
      this.#emitter.emit('session:migrated', {
        fromSessionId: this.#sessionIdFromCookie,
        toSessionId: this.sessionId,
        session: this,
      })
    } else {
      await this.#store.write(this.#sessionId, this.#valuesStore.toJSON())
    }

    this.#emitter.emit('session:committed', { session: this })
  }
}
