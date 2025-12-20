/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@adonisjs/core/helpers/string'
import { MessageBuilder } from '@adonisjs/core/helpers'
import type { Connection } from '@adonisjs/redis/types'

import debug from '../debug.ts'
import type { SessionData, TaggedSession, SessionStoreWithTaggingContract } from '../types.ts'

/**
 * Redis store to read/write session data to Redis server.
 * Provides fast, scalable session storage with automatic expiry.
 *
 * @example
 * const redisStore = new RedisStore(redisConnection, '2 hours')
 */
export class RedisStore implements SessionStoreWithTaggingContract {
  /**
   * Redis connection instance
   */
  #connection: Connection

  /**
   * Time-to-live in seconds for session expiry
   */
  #ttlSeconds: number

  /**
   * Creates a new Redis store instance
   *
   * @param connection - Redis connection instance
   * @param age - Session age in seconds or time expression (e.g. '2 hours')
   */
  constructor(connection: Connection, age: string | number) {
    this.#connection = connection
    this.#ttlSeconds = string.seconds.parse(age)
    debug('initiating redis store')
  }

  /**
   * Processes a single session result from the pipeline
   */
  #processSessionResult(options: { sessionId: string; contents: string | null }): {
    session: TaggedSession | null
    isInvalid: boolean
  } {
    if (!options.contents) return { session: null, isInvalid: true }

    const data = this.#parseSessionData(options.contents, options.sessionId)
    if (!data) return { session: null, isInvalid: true }

    return { session: { id: options.sessionId, data }, isInvalid: false }
  }

  /**
   * Fetches session contents for multiple session IDs using a pipeline
   */
  async #fetchSessionContents(sessionIds: string[]): Promise<Array<string | null>> {
    const pipeline = this.#connection.pipeline()
    sessionIds.forEach((sessionId) => pipeline.get(sessionId))
    const results = await pipeline.exec()

    return results?.map((result) => result[1] as string | null) ?? []
  }

  /**
   * Removes invalid session IDs from the user's tag set
   */
  async #cleanupInvalidSessions(userId: string, invalidSessionIds: string[]): Promise<void> {
    if (invalidSessionIds.length === 0) return

    await this.#connection.srem(this.#getTagKey(userId), ...invalidSessionIds)
  }

  /*
   * Returns the key for a user's tag set (stores session IDs for a user)
   */
  #getTagKey(userId: string): string {
    return `session_tag:${userId}`
  }

  /**
   * Verify contents with the session id and return them as an object. The verify
   * method can fail when the contents is not JSON
   */
  #parseSessionData(contents: string, sessionId: string): SessionData | null {
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Reads session data from Redis
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = await store.read('sess_abc123')
   */
  async read(sessionId: string): Promise<SessionData | null> {
    debug('redis store: reading session data %s', sessionId)

    const contents = await this.#connection.get(sessionId)
    if (!contents) {
      return null
    }

    /**
     * Verify contents with the session id and return them as an object. The verify
     * method can fail when the contents is not JSON>
     */
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Writes session values to Redis with expiry
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * await store.write('sess_abc123', { userId: 123 })
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('redis store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    await this.#connection.setex(sessionId, this.#ttlSeconds, message)
  }

  /**
   * Removes session data from Redis
   *
   * @param sessionId - Session identifier to remove
   *
   * @example
   * await store.destroy('sess_abc123')
   */
  async destroy(sessionId: string): Promise<void> {
    debug('redis store: destroying session data %s', sessionId)
    await this.#connection.del(sessionId)
  }

  /**
   * Updates the session expiry time in Redis
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await store.touch('sess_abc123')
   */
  async touch(sessionId: string): Promise<void> {
    debug('redis store: touching session data %s', sessionId)
    await this.#connection.expire(sessionId, this.#ttlSeconds)
  }

  /**
   * Tag a session with a user ID
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to tag the session with
   */
  async tag(sessionId: string, userId: string): Promise<void> {
    debug('redis store: tagging session %s with user %s', sessionId, userId)
    await this.#connection.sadd(this.#getTagKey(userId), sessionId)
  }

  /**
   * Get all sessions for a given user ID (tag)
   *
   * @param userId - User identifier to get sessions for
   */
  async tagged(userId: string): Promise<TaggedSession[]> {
    debug('redis store: getting sessions tagged with user %s', userId)

    const sessionIds = await this.#connection.smembers(this.#getTagKey(userId))
    if (sessionIds.length === 0) return []

    const contents = await this.#fetchSessionContents(sessionIds)

    const results = sessionIds.map((sessionId, index) =>
      this.#processSessionResult({ sessionId, contents: contents[index] })
    )

    const validSessions = results.filter((r) => r.session !== null).map((r) => r.session!)
    const invalidSessionIds = results
      .map((result, index) => (result.isInvalid ? sessionIds[index] : null))
      .filter((id) => id !== null)

    await this.#cleanupInvalidSessions(userId, invalidSessionIds)

    return validSessions
  }
}
