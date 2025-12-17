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
import type { Connection } from '@adonisjs/redis/types'

import debug from '../debug.js'
import type { SessionStoreWithTaggingContract, SessionData, TaggedSession } from '../types.js'

/**
 * Redis store to read/write session to Redis
 */
export class RedisStore implements SessionStoreWithTaggingContract {
  #connection: Connection
  #ttlSeconds: number

  constructor(connection: Connection, age: string | number) {
    this.#connection = connection
    this.#ttlSeconds = string.seconds.parse(age)
    debug('initiating redis store')
  }

  /**
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
   * Returns session data
   */
  async read(sessionId: string): Promise<SessionData | null> {
    debug('redis store: reading session data %s', sessionId)

    const contents = await this.#connection.get(sessionId)
    if (!contents) {
      return null
    }

    return this.#parseSessionData(contents, sessionId)
  }

  /**
   * Write session values to redis
   */
  async write(sessionId: string, values: Record<string, any>): Promise<void> {
    debug('redis store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    await this.#connection.setex(sessionId, this.#ttlSeconds, message)
  }

  /**
   * Cleanup session by removing it
   */
  async destroy(sessionId: string): Promise<void> {
    debug('redis store: destroying session data %s', sessionId)
    await this.#connection.del(sessionId)
  }

  /**
   * Updates the value expiry
   */
  async touch(sessionId: string): Promise<void> {
    debug('redis store: touching session data %s', sessionId)
    await this.#connection.expire(sessionId, this.#ttlSeconds)
  }

  /**
   * Tag a session with a user ID
   */
  async tag(sessionId: string, userId: string): Promise<void> {
    debug('redis store: tagging session %s with user %s', sessionId, userId)
    await this.#connection.sadd(this.#getTagKey(userId), sessionId)
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

  /**
   * Get all sessions for a given user ID (tag)
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
