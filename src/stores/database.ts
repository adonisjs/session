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

import debug from '../debug.ts'
import type { SessionStoreWithTaggingContract, SessionData, TaggedSession } from '../types.ts'

/**
 * Database store to read/write session to SQL databases using Lucid
 */
export class DatabaseStore implements SessionStoreWithTaggingContract {
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
   * Parses and verifies session data using MessageBuilder
   */
  #parseSessionData(contents: string, sessionId: string): SessionData | null {
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Returns session data
   *
   * @param sessionId - Session identifier
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

    return this.#parseSessionData(row.data, sessionId)
  }

  /**
   * Write session values to the database
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('database store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)

    await this.#client
      .insertQuery()
      .table(this.#tableName)
      .insert({ id: sessionId, data: message, expires_at: expiresAt })
      .knexQuery.onConflict('id')
      .merge(['data', 'expires_at'])

    await this.#collectGarbage()
  }

  /**
   * Cleanup session by removing it
   *
   * @param sessionId - Session identifier
   */
  async destroy(sessionId: string): Promise<void> {
    debug('database store: destroying session data %s', sessionId)

    await this.#client.from(this.#tableName).where('id', sessionId).delete()
  }

  /**
   * Updates the session expiry
   *
   * @param sessionId - Session identifier
   */
  async touch(sessionId: string): Promise<void> {
    debug('database store: touching session data %s', sessionId)

    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)

    await this.#client
      .from(this.#tableName)
      .where('id', sessionId)
      .update({ expires_at: expiresAt })
  }

  /**
   * Tag a session with a user ID.
   * Uses UPSERT to handle both existing and new sessions.
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to tag the session with
   */
  async tag(sessionId: string, userId: string): Promise<void> {
    debug('database store: tagging session %s with user %s', sessionId, userId)

    const data = new MessageBuilder().build({}, undefined, sessionId)
    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)

    await this.#client
      .insertQuery()
      .table(this.#tableName)
      .insert({ id: sessionId, user_id: userId, data, expires_at: expiresAt })
      .knexQuery.onConflict('id')
      .merge(['user_id'])
  }

  /**
   * Converts a database row to a TaggedSession object
   */
  #rowToTaggedSession(row: { id: string; data: string }): TaggedSession | null {
    const data = this.#parseSessionData(row.data, row.id)
    if (!data) return null

    return { id: row.id, data }
  }

  /**
   * Get all sessions for a given user ID (tag)
   *
   * @param userId - User identifier to get sessions for
   */
  async tagged(userId: string): Promise<TaggedSession[]> {
    debug('database store: getting sessions tagged with user %s', userId)

    const rows = await this.#client
      .from(this.#tableName)
      .select('id', 'data')
      .where('user_id', userId)
      .where('expires_at', '>', new Date())

    return rows.map((row) => this.#rowToTaggedSession(row)).filter((session) => session !== null)
  }
}
