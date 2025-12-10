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
import type { SessionStoreWithTaggingContract, SessionData } from '../types.js'

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
   * Returns session data
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
   * Get all session IDs for a given user ID (tag)
   */
  async tagged(userId: string): Promise<string[]> {
    debug('redis store: getting sessions tagged with user %s', userId)

    const sessionIds = await this.#connection.smembers(this.#getTagKey(userId))
    if (sessionIds.length === 0) return []

    // Check all sessions existence in a single pipeline
    const pipeline = this.#connection.pipeline()
    for (const sessionId of sessionIds) pipeline.exists(sessionId)
    const results = await pipeline.exec()

    // Filter out expired/deleted sessions
    const validSessionIds: string[] = []
    const invalidSessionIds: string[] = []

    for (const [index, sessionId] of sessionIds.entries()) {
      const exists = results?.[index]?.[1] === 1
      if (exists) {
        validSessionIds.push(sessionId)
      } else {
        invalidSessionIds.push(sessionId)
      }
    }

    if (invalidSessionIds.length > 0) {
      await this.#connection.srem(this.#getTagKey(userId), ...invalidSessionIds)
    }

    return validSessionIds
  }
}
