/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { cuid } from '@adonisjs/core/helpers'
import { EmitterService } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'

import { ReadOnlyStore, Store } from './store.js'
import * as errors from './errors.js'
import type {
  SessionData,
  SessionConfig,
  AllowedSessionValues,
  SessionDriverContract,
} from './types/main.js'
import debug from './debug.js'
import { HttpError } from '@adonisjs/core/types/http'

/**
 * The session class exposes the API to read and write values to
 * the session store.
 *
 * A session instance is isolated between requests but
 * uses a centralized persistence store and
 */
export class Session {
  #config: SessionConfig
  #driver: SessionDriverContract
  #emitter: EmitterService
  #ctx: HttpContext
  #readonly: boolean = false
  #store?: Store

  /**
   * Session id refers to the session id that will be committed
   * as a cookie during the response.
   */
  #sessionId: string

  /**
   * Session id from cookie refers to the value we read from the
   * cookie during the HTTP request.
   *
   * This only might not exist during the first request. Also during
   * session id re-generation, this value will be different from
   * the session id.
   */
  #sessionIdFromCookie?: string

  /**
   * Store of flash messages that be written during the
   * HTTP request
   */
  responseFlashMessages = new Store({})

  /**
   * Store of flash messages for the current HTTP request.
   */
  flashMessages = new Store({})

  /**
   * The key to use for storing flash messages inside
   * the session store.
   */
  flashKey: string = '__flash__'

  /**
   * Session id for the current HTTP request
   */
  get sessionId() {
    return this.#sessionId
  }

  /**
   * A boolean to know if a fresh session is created during
   * the request
   */
  get fresh(): boolean {
    return this.#sessionIdFromCookie === undefined
  }

  /**
   * A boolean to know if session is in readonly
   * state
   */
  get readonly() {
    return this.#readonly
  }

  /**
   * A boolean to know if session store has been initiated
   */
  get initiated() {
    return !!this.#store
  }

  /**
   * A boolean to know if the session id has been re-generated
   * during the current request
   */
  get hasRegeneratedSession() {
    return !!(this.#sessionIdFromCookie && this.#sessionIdFromCookie !== this.#sessionId)
  }

  /**
   * A boolean to know if the session store is empty
   */
  get isEmpty() {
    return this.#store?.isEmpty ?? true
  }

  /**
   * A boolean to know if the session store has been
   * modified
   */
  get hasBeenModified() {
    return this.#store?.hasBeenModified ?? false
  }

  constructor(
    config: SessionConfig,
    driver: SessionDriverContract,
    emitter: EmitterService,
    ctx: HttpContext
  ) {
    this.#ctx = ctx
    this.#config = config
    this.#driver = driver
    this.#emitter = emitter
    this.#sessionIdFromCookie = ctx.request.cookie(config.cookieName, undefined)
    this.#sessionId = this.#sessionIdFromCookie || cuid()
  }

  /**
   * Returns the flash messages store for a given
   * mode
   */
  #getFlashStore(mode: 'write' | 'read'): Store {
    if (!this.#store) {
      throw new errors.E_SESSION_NOT_READY()
    }

    if (mode === 'write' && this.readonly) {
      throw new errors.E_SESSION_NOT_MUTABLE()
    }

    return this.responseFlashMessages
  }

  /**
   * Returns the store instance for a given mode
   */
  #getStore(mode: 'write' | 'read'): Store {
    if (!this.#store) {
      throw new errors.E_SESSION_NOT_READY()
    }

    if (mode === 'write' && this.readonly) {
      throw new errors.E_SESSION_NOT_MUTABLE()
    }

    return this.#store
  }

  /**
   * Initiates the session store. The method results in a noop
   * when called multiple times
   */
  async initiate(readonly: boolean): Promise<void> {
    if (this.#store) {
      return
    }

    debug('initiating session (readonly: %s)', readonly)

    this.#readonly = readonly
    const contents = await this.#driver.read(this.#sessionId)
    this.#store = new Store(contents)

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
        session: new ReadOnlyStore(this.#store.all()),
        flashMessages: new ReadOnlyStore(this.flashMessages.all()),
        old: function (key: string, defaultValue?: any) {
          return this.flashMessages.get(key, defaultValue)
        },
      })
    }

    this.#emitter.emit('session:initiated', { session: this })
  }

  /**
   * Put a key-value pair to the session data store
   */
  put(key: string, value: AllowedSessionValues) {
    this.#getStore('write').set(key, value)
  }

  /**
   * Check if a key exists inside the datastore
   */
  has(key: string): boolean {
    return this.#getStore('read').has(key)
  }

  /**
   * Get the value of a key from the session datastore.
   * You can specify a default value to use, when key
   * does not exists or has undefined value.
   */
  get(key: string, defaultValue?: any) {
    return this.#getStore('read').get(key, defaultValue)
  }

  /**
   * Get everything from the session store
   */
  all() {
    return this.#getStore('read').all()
  }

  /**
   * Remove a key from the session datastore
   */
  forget(key: string) {
    return this.#getStore('write').unset(key)
  }

  /**
   * Read value for a key from the session datastore
   * and remove it simultaneously.
   */
  pull(key: string, defaultValue?: any) {
    return this.#getStore('write').pull(key, defaultValue)
  }

  /**
   * Increment the value of a key inside the session
   * store.
   *
   * A new key will be defined if does not exists already.
   * The value of a new key will be 1
   */
  increment(key: string, steps: number = 1) {
    return this.#getStore('write').increment(key, steps)
  }

  /**
   * Increment the value of a key inside the session
   * store.
   *
   * A new key will be defined if does not exists already.
   * The value of a new key will be -1
   */
  decrement(key: string, steps: number = 1) {
    return this.#getStore('write').decrement(key, steps)
  }

  /**
   * Empty the session store
   */
  clear() {
    return this.#getStore('write').clear()
  }

  /**
   * Flash validation error messages. Make sure the error
   * is an instance of VineJS ValidationException
   */
  flashValidationErrors(error: HttpError) {
    const errorsBag = error.messages.reduce((result: Record<string, string[]>, message: any) => {
      if (result[message.field]) {
        result[message.field].push(message.message)
      } else {
        result[message.field] = [message.message]
      }
      return result
    }, {})

    this.flashExcept(['_csrf', '_method'])
    this.flash('errors', errorsBag)
  }

  /**
   * Add a key-value pair to flash messages
   */
  flash(key: string, value: AllowedSessionValues): void
  flash(keyValue: SessionData): void
  flash(key: string | SessionData, value?: AllowedSessionValues): void {
    if (typeof key === 'string') {
      if (value) {
        this.#getFlashStore('write').set(key, value)
      }
    } else {
      this.#getFlashStore('write').merge(key)
    }
  }

  /**
   * Flash form input data to the flash messages store
   */
  flashAll() {
    return this.#getFlashStore('write').set('input', this.#ctx.request.original())
  }

  /**
   * Flash form input data (except some keys) to the flash messages store
   */
  flashExcept(keys: string[]): void {
    this.#getFlashStore('write').set('input', lodash.omit(this.#ctx.request.original(), keys))
  }

  /**
   * Flash form input data (only some keys) to the flash messages store
   */
  flashOnly(keys: string[]): void {
    this.#getFlashStore('write').set('input', lodash.pick(this.#ctx.request.original(), keys))
  }

  /**
   * Reflash messages from the last request in the current response
   */
  reflash(): void {
    this.#getFlashStore('write').set('reflashed', this.flashMessages.all())
  }

  /**
   * Reflash messages (only some keys) from the last
   * request in the current response
   */
  reflashOnly(keys: string[]) {
    this.#getFlashStore('write').set('reflashed', lodash.pick(this.flashMessages.all(), keys))
  }

  /**
   * Reflash messages (except some keys) from the last
   * request in the current response
   */
  reflashExcept(keys: string[]) {
    this.#getFlashStore('write').set('reflashed', lodash.omit(this.flashMessages.all(), keys))
  }

  /**
   * Re-generate the session id and migrate data to it.
   */
  regenerate() {
    this.#sessionId = cuid()
  }

  /**
   * Commit session changes. No more mutations will be
   * allowed after commit.
   */
  async commit() {
    if (!this.#store || this.readonly) {
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
    this.#ctx.response.cookie(this.#config.cookieName, this.#sessionId, this.#config.cookie!)

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
        await this.#driver.destroy(this.#sessionIdFromCookie)
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
        await this.#driver.destroy(this.#sessionIdFromCookie)
        await this.#driver.write(this.#sessionId, this.#store.toJSON())
        this.#emitter.emit('session:migrated', {
          fromSessionId: this.#sessionIdFromCookie,
          toSessionId: this.sessionId,
          session: this,
        })
      } else {
        await this.#driver.touch(this.#sessionId)
      }
      this.#emitter.emit('session:committed', { session: this })
      return
    }

    /**
     * Otherwise commit to the session store
     */
    if (this.#sessionIdFromCookie && this.#sessionIdFromCookie !== this.#sessionId) {
      await this.#driver.destroy(this.#sessionIdFromCookie)
      await this.#driver.write(this.#sessionId, this.#store.toJSON())
      this.#emitter.emit('session:migrated', {
        fromSessionId: this.#sessionIdFromCookie,
        toSessionId: this.sessionId,
        session: this,
      })
    } else {
      await this.#driver.write(this.#sessionId, this.#store.toJSON())
    }

    this.#emitter.emit('session:committed', { session: this })
  }
}
