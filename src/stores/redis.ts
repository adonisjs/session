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
import type {
  SessionData,
  TaggedSession,
  SessionEncryption,
  SessionStoreWithTaggingContract,
} from '../types.ts'

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
   * Encrypts the session data when defined. Otherwise the data is
   * only signed.
   */
  #encryption?: SessionEncryption

  /**
   * Ids of the sessions this store found while reading. A store serves
   * one request, so a write to one of them must not bring it back once
   * another request destroyed it.
   */
  #found = new Set<string>()

  /**
   * User ids the sessions were tagged with by this store. The write of a
   * tagged session adds it to the tag set in the same transaction.
   */
  #tags = new Map<string, string>()

  /**
   * Creates a new Redis store instance
   *
   * @param connection - Redis connection instance
   * @param age - Session age in seconds or time expression (e.g. '2 hours')
   * @param options.encryption - Encrypts the session data instead of only signing it
   */
  constructor(
    connection: Connection,
    age: string | number,
    options?: { encryption?: SessionEncryption }
  ) {
    this.#connection = connection
    this.#ttlSeconds = string.seconds.parse(age)
    this.#encryption = options?.encryption
    debug('initiating redis store')
  }

  /**
   * Processes a single session result from the pipeline.
   * Parses session data and determines validity.
   *
   * @param options - Session ID and contents to process
   * @param options.sessionId - Session identifier
   * @param options.contents - Session data as string
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
   * Fetches session contents for multiple session IDs using a Redis pipeline.
   * Optimizes performance by batching multiple GET commands into a single round trip.
   *
   * @param sessionIds - Array of session identifiers to fetch
   */
  async #fetchSessionContents(sessionIds: string[]): Promise<Array<string | null>> {
    const pipeline = this.#connection.pipeline()
    sessionIds.forEach((sessionId) => pipeline.get(sessionId))
    const results = await pipeline.exec()

    return results?.map((result) => result[1] as string | null) ?? []
  }

  /**
   * Removes invalid session IDs from the user's tag set.
   * Cleans up expired or corrupted session references.
   *
   * @param userId - User identifier whose sessions to clean up
   * @param invalidSessionIds - Array of invalid session IDs to remove
   */
  async #cleanupInvalidSessions(userId: string, invalidSessionIds: string[]): Promise<void> {
    if (invalidSessionIds.length === 0) return

    await this.#connection.srem(this.#getTagKey(userId), ...invalidSessionIds)
  }

  /**
   * Returns the Redis key for a user's tag set.
   * The tag set stores all session IDs associated with a user.
   *
   * @param userId - User identifier
   */
  #getTagKey(userId: string): string {
    return `session_tag:${userId}`
  }

  /**
   * Verifies and parses session data from string format.
   * Returns null if the contents is not valid JSON or verification fails.
   *
   * @param contents - Session data as string
   * @param sessionId - Session identifier used for verification
   */
  #parseSessionData(contents: string, sessionId: string): SessionData | null {
    try {
      if (this.#encryption) {
        return this.#encryption.decrypt<SessionData>(contents, sessionId)
      }
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Encrypts or signs the session data for the session id
   *
   * @param values - Session data to serialize
   * @param sessionId - Session identifier used as the purpose
   */
  #serializeSessionData(values: Object, sessionId: string): string {
    if (this.#encryption) {
      return this.#encryption.encrypt(values, undefined, sessionId)
    }
    return new MessageBuilder().build(values, undefined, sessionId)
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

    this.#found.add(sessionId)
    return this.#parseSessionData(contents, sessionId)
  }

  /**
   * Writes session values to Redis with expiry. A session read by this
   * store is only updated while it still exists (`XX`), so a logout or
   * a destroy that happened during the request is not undone.
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * await store.write('sess_abc123', { userId: 123 })
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('redis store: writing session data %s, %O', sessionId, values)

    const message = this.#serializeSessionData(values, sessionId)
    const onlyIfExists = this.#found.has(sessionId)
    const userId = this.#tags.get(sessionId)

    /**
     * A concurrent "tagged" call drops ids that have no data yet. Adding
     * the id along with the data keeps it in the set. When "XX" refuses
     * the write, the id has no data and the next "tagged" call drops it.
     *
     * Redis Cluster refuses a MULTI over keys of different slots, so the
     * id is added right after the data there. A "tagged" call that read
     * the set before the data and removes the id after the SADD can still
     * drop it.
     */
    if (!userId || this.#connection.ioConnection.isCluster) {
      if (onlyIfExists) {
        await this.#connection.set(sessionId, message, 'EX', this.#ttlSeconds, 'XX')
      } else {
        await this.#connection.set(sessionId, message, 'EX', this.#ttlSeconds)
      }

      if (userId) {
        await this.#connection.sadd(this.#getTagKey(userId), sessionId)
      }
      return
    }

    const transaction = this.#connection.multi()
    if (onlyIfExists) {
      transaction.set(sessionId, message, 'EX', this.#ttlSeconds, 'XX')
    } else {
      transaction.set(sessionId, message, 'EX', this.#ttlSeconds)
    }
    transaction.sadd(this.#getTagKey(userId), sessionId)

    const results = await transaction.exec()
    const failure = results?.find(([error]) => error)
    if (failure) {
      throw failure[0]
    }
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
   * Tag a session with a user ID. The next write of the session by this
   * store tags it again, atomically with its data.
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to tag the session with
   */
  async tag(sessionId: string, userId: string | number): Promise<void> {
    debug('redis store: tagging session %s with user %s', sessionId, userId)
    this.#tags.set(sessionId, String(userId))
    await this.#connection.sadd(this.#getTagKey(String(userId)), sessionId)
  }

  /**
   * Untag a session from a user ID
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to untag the session from
   */
  async untag(sessionId: string, userId: string | number): Promise<void> {
    debug('redis store: untagging session %s from user %s', sessionId, userId)
    this.#tags.delete(sessionId)
    await this.#connection.srem(this.#getTagKey(userId.toString()), sessionId)
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
