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
import type { SessionStoreContract, SessionData } from '../types.ts'

/**
 * Redis store to read/write session data to Redis server.
 * Provides fast, scalable session storage with automatic expiry.
 *
 * @example
 * const redisStore = new RedisStore(redisConnection, '2 hours')
 */
export class RedisStore implements SessionStoreContract {
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
}
