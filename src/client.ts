/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { cuid } from '@adonisjs/core/helpers'

import debug from './debug.js'
import { ValuesStore } from './values_store.js'
import type { SessionData, SessionStoreContract } from './types.js'

/**
 * Session client exposes the API to set session data as a client
 */
export class SessionClient {
  /**
   * Data store
   */
  #valuesStore = new ValuesStore({})

  /**
   * Flash messages store
   */
  #flashMessagesStore = new ValuesStore({})

  /**
   * The session store to use for reading and writing session data
   */
  #store: SessionStoreContract

  /**
   * Session key for setting flash messages
   */
  flashKey = '__flash__'

  /**
   * Session to use when no explicit session id is
   * defined
   */
  sessionId = cuid()

  constructor(store: SessionStoreContract) {
    this.#store = store
  }

  /**
   * Merge session data
   */
  merge(values: SessionData) {
    this.#valuesStore.merge(values)
    return this
  }

  /**
   * Merge flash messages
   */
  flash(values: SessionData) {
    this.#flashMessagesStore.merge(values)
    return this
  }

  /**
   * Commits data to the session store.
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
   * Destroys the session data with the store
   */
  async destroy(sessionId?: string) {
    debug('destroying session data during api request')
    this.#store.destroy(sessionId || this.sessionId)
  }

  /**
   * Loads session data from the session store
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
