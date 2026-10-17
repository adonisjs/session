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
 * Database store to read/write session data to SQL databases using Lucid.
 * Supports PostgreSQL, MySQL, SQLite, and other Lucid-compatible databases.
 * Includes automatic garbage collection of expired sessions.
 *
 * @example
 * const dbStore = new DatabaseStore(db.connection(), '2 hours', {
 *   tableName: 'sessions',
 *   gcProbability: 2
 * })
 */
export class DatabaseStore implements SessionStoreWithTaggingContract {
  #client: QueryClientContract
  #tableName: string
  #ttlSeconds: number
  #gcProbability: number

  /**
   * Ids of the sessions this store found while reading. A store serves
   * one request, so a write to one of them must not bring it back once
   * another request destroyed it.
   */
  #found = new Set<string>()

  /**
   * User ids the sessions were tagged with by this store. The write of a
   * tagged session stores the user id in the same query as its data.
   */
  #tags = new Map<string, string>()

  /**
   * Creates a new database store instance
   *
   * @param client - Lucid query client instance
   * @param age - Session age in seconds or time expression (e.g. '2 hours')
   * @param options - Configuration options
   * @param options.tableName - Database table name (defaults to "sessions")
   * @param options.gcProbability - Garbage collection probability in percent (defaults to 2)
   */
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
   * Runs garbage collection to delete expired sessions from the database.
   * Executes probabilistically based on gcProbability setting after writing session data.
   * Helps maintain database performance by removing stale session records.
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
   * Parses and verifies session data from string format.
   * Returns null if the data is corrupted or verification fails.
   *
   * @param contents - Session data as string
   * @param sessionId - Session identifier for verification
   */
  #parseSessionData(contents: string, sessionId: string): SessionData | null {
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Converts a database row to a TaggedSession object.
   * Parses the session data and returns null if parsing fails.
   *
   * @param row - Database row containing session ID and data
   * @param row.id - Session identifier
   * @param row.data - Session data as string
   */
  #rowToTaggedSession(row: { id: string; data: string }): TaggedSession | null {
    const data = this.#parseSessionData(row.data, row.id)
    if (!data) {
      return null
    }

    return { id: row.id, data }
  }

  /**
   * Reads session data from the database
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = await store.read('sess_abc123')
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

    this.#found.add(sessionId)
    return this.#parseSessionData(row.data, sessionId)
  }

  /**
   * Writes session values to the database with expiry. A session read by
   * this store is only updated (no insert), so a logout or a destroy that
   * happened during the request is not undone. Other sessions are upserted.
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * await store.write('sess_abc123', { userId: 123 })
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('database store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    const expiresAt = new Date(Date.now() + this.#ttlSeconds * 1000)
    const userId = this.#tags.get(sessionId)
    const columns = {
      data: message,
      expires_at: expiresAt,
      ...(userId && { user_id: userId }),
    }

    if (this.#found.has(sessionId)) {
      await this.#client.from(this.#tableName).where('id', sessionId).update(columns)
    } else {
      await this.#client
        .insertQuery()
        .table(this.#tableName)
        .insert({ id: sessionId, ...columns })
        .knexQuery.onConflict('id')
        .merge(Object.keys(columns))
    }

    await this.#collectGarbage()
  }

  /**
   * Removes session data from the database
   *
   * @param sessionId - Session identifier to remove
   *
   * @example
   * await store.destroy('sess_abc123')
   */
  async destroy(sessionId: string): Promise<void> {
    debug('database store: destroying session data %s', sessionId)

    await this.#client.from(this.#tableName).where('id', sessionId).delete()
  }

  /**
   * Updates the session expiry time in the database
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await store.touch('sess_abc123')
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
   * Tags a session with a user ID for tracking user sessions. Updates the
   * row when it exists, and the next write of the session by this store
   * stores the user ID along with its data. No row is created for a
   * session without data.
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to tag the session with
   *
   * @example
   * await store.tag('sess_abc123', 'user_456')
   */
  async tag(sessionId: string, userId: string | number): Promise<void> {
    debug('database store: associating user %s with session %s', userId, sessionId)

    this.#tags.set(sessionId, String(userId))
    await this.#client
      .from(this.#tableName)
      .where('id', sessionId)
      .update({ user_id: String(userId) })
  }

  /**
   * Removes the tag association between a session and a user ID.
   * Sets the user_id column to null for the given session.
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier (for logging purposes)
   *
   * @example
   * await store.untag('sess_abc123', 'user_456')
   */
  async untag(sessionId: string, userId: string | number): Promise<void> {
    debug('database store: dissociating user %s from session %s', userId, sessionId)

    this.#tags.delete(sessionId)
    await this.#client
      .query()
      .from(this.#tableName)
      .update({ user_id: null })
      .where({ id: sessionId })
  }

  /**
   * Returns all active sessions for a given user ID (tag).
   * Only returns non-expired sessions.
   *
   * @param userId - User identifier to get sessions for
   *
   * @example
   * const sessions = await store.tagged('user_456')
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
