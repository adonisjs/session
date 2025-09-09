/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto'

import debug from './debug.ts'
import { ValuesStore } from './values_store.ts'
import type { SessionData, SessionStoreContract } from './types.ts'

/**
 * Session client exposes the API to set session data as a client.
 * Useful for testing or programmatic session manipulation.
 *
 * @example
 * const client = new SessionClient(store)
 * client.merge({ userId: 123 })
 * client.flash({ success: 'Login successful' })
 * await client.commit()
 */
export class SessionClient {
  /**
   * Internal data store for session values
   */
  #valuesStore = new ValuesStore({})

  /**
   * Internal store for flash messages
   */
  #flashMessagesStore = new ValuesStore({})

  /**
   * The session store contract for reading and writing session data
   */
  #store: SessionStoreContract

  /**
   * Session key used for storing flash messages
   */
  flashKey = '__flash__'

  /**
   * Session ID to use when no explicit session id is defined
   */
  sessionId = randomUUID()

  /**
   * Creates a new session client
   *
   * @param store - Session store contract implementation
   */
  constructor(store: SessionStoreContract) {
    this.#store = store
  }

  /**
   * Merges session data with existing values
   *
   * @param values - Session data to merge
   *
   * @example
   * client.merge({ userId: 123, theme: 'dark' })
   */
  merge(values: SessionData) {
    this.#valuesStore.merge(values)
    return this
  }

  /**
   * Merges flash messages with existing flash data
   *
   * @param values - Flash message data to merge
   *
   * @example
   * client.flash({ success: 'Operation completed', info: 'Check your email' })
   */
  flash(values: SessionData) {
    this.#flashMessagesStore.merge(values)
    return this
  }

  /**
   * Commits data to the session store
   *
   * @example
   * await client.commit() // Saves all changes to the store
   */
  async commit() {
    if (!this.#flashMessagesStore.isEmpty) {
      this.#valuesStore.set(this.flashKey, this.#flashMessagesStore.toJSON())
    }

    debug('committing session data during api request')
    if (!this.#valuesStore.isEmpty) {
      this.#store.write(this.sessionId, this.#valuesStore.toJSON())
    }
  }

  /**
   * Destroys the session data from the store
   *
   * @param sessionId - Optional session ID to destroy (defaults to current session)
   *
   * @example
   * await client.destroy()           // Destroy current session
   * await client.destroy('abc123')   // Destroy specific session
   */
  async destroy(sessionId?: string) {
    debug('destroying session data during api request')
    this.#store.destroy(sessionId || this.sessionId)
  }

  /**
   * Loads session data from the session store
   *
   * @param sessionId - Optional session ID to load (defaults to current session)
   *
   * @example
   * const { values, flashMessages } = await client.load()
   * const data = await client.load('abc123') // Load specific session
   */
  async load(sessionId?: string) {
    const contents = await this.#store.read(sessionId || this.sessionId)
    const store = new ValuesStore(contents)
    const flashMessages = store.pull(this.flashKey, {})

    return {
      values: store.all(),
      flashMessages,
    }
  }
}
