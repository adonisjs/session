/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { MessageBuilder } from '@adonisjs/core/helpers'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'

import debug from '../debug.js'
import type { SessionStoreContract, SessionData } from '../types.js'

/**
 * Database store to read/write session to SQL databases using Lucid
 */
export class DatabaseStore implements SessionStoreContract {
  #client: QueryClientContract
  #tableName: string
  #ttlSeconds: number
  #gcProbability: number

  constructor(
    client: QueryClientContract,
    age: string | number,
    options?: {
      /**
       * Defaults to "sessions"
       */
      tableName?: string

      /**
       * The probability (in percent) that garbage collection will be
       * triggered on any given request. For example, 2 means 2% chance.
       *
       * Set to 0 to disable garbage collection.
       *
       * Defaults to 2 (2% chance)
       */
      gcProbability?: number
    }
  ) {
    this.#client = client
    this.#tableName = options?.tableName ?? 'sessions'
    this.#ttlSeconds = string.seconds.parse(age)
    this.#gcProbability = options?.gcProbability ?? 2
    debug('initiating database store')
  }

  /**
   * Run garbage collection to delete expired sessions.
   * This is called based on gcProbability after writing session data.
   */
  async #collectGarbage(): Promise<void> {
    if (this.#gcProbability <= 0) {
      return
    }

    const random = Math.random() * 100
    if (random < this.#gcProbability) {
      debug('database store: running garbage collection')
      const expiredBefore = new Date(Date.now())
      await this.#client.from(this.#tableName).where('expires_at', '<=', expiredBefore).delete()
    }
  }

  /**
   * Returns session data
   */
  async read(sessionId: string): Promise<SessionData | null> {
    debug('database store: reading session data %s', sessionId)

    const row = await this.#client.from(this.#tableName).where('id', sessionId).first()

    if (!row) {
      return null
    }

    /**
     * Check if the session has expired. If so, delete it and return null.
     */
    const expiresAt = new Date(row.expires_at).getTime()
    if (Date.now() > expiresAt) {
      await this.destroy(sessionId)
      return null
    }

    /**
     * Verify contents with the session id and return them as an object
     */
    try {
      return new MessageBuilder().verify<SessionData>(row.data, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Write session values to the database
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('database store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)

    await this.#client
      .insertQuery()
      .table(this.#tableName)
      .insert({
        id: sessionId,
        data: message,
        expires_at: expiresAt,
      })
      .knexQuery.onConflict('id')
      .merge(['data', 'expires_at'])

    await this.#collectGarbage()
  }

  /**
   * Cleanup session by removing it
   */
  async destroy(sessionId: string): Promise<void> {
    debug('database store: destroying session data %s', sessionId)

    await this.#client.from(this.#tableName).where('id', sessionId).delete()
  }

  /**
   * Updates the session expiry
   */
  async touch(sessionId: string): Promise<void> {
    debug('database store: touching session data %s', sessionId)

    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)

    await this.#client
      .from(this.#tableName)
      .where('id', sessionId)
      .update({ expires_at: expiresAt })
  }
}
