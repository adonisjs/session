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
import { Store } from './store.js'
import type { SessionData, SessionDriverContract } from './types/main.js'

/**
 * Session client exposes the API to set session data as a client
 */
export class SessionClient {
  /**
   * Data store
   */
  #store = new Store({})

  /**
   * Flash messages store
   */
  #flashMessagesStore = new Store({})

  /**
   * The session driver to use for reading and writing session data
   */
  #driver: SessionDriverContract

  /**
   * Session key for setting flash messages
   */
  flashKey = '__flash__'

  /**
   * Session to use when no explicit session id is
   * defined
   */
  sessionId = cuid()

  constructor(driver: SessionDriverContract) {
    this.#driver = driver
  }

  /**
   * Merge session data
   */
  merge(values: SessionData) {
    this.#store.merge(values)
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
      this.#store.set(this.flashKey, this.#flashMessagesStore.toJSON())
    }

    debug('committing session data during api request')
    if (!this.#store.isEmpty) {
      this.#driver.write(this.sessionId, this.#store.toJSON())
    }
  }

  /**
   * Destroys the session data with the store
   */
  async destroy(sessionId?: string) {
    debug('destroying session data during api request')
    this.#driver.destroy(sessionId || this.sessionId)
  }

  /**
   * Loads session data from the session store
   */
  async load(sessionId?: string) {
    const contents = await this.#driver.read(sessionId || this.sessionId)
    const store = new Store(contents)
    const flashMessages = store.pull(this.flashKey, {})

    return {
      values: store.all(),
      flashMessages,
    }
  }
}
