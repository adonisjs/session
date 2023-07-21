/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@poppinss/utils'
import string from '@poppinss/utils/string'
import { MessageBuilder } from '@poppinss/utils'
import type { RedisConnectionContract, RedisManagerContract } from '@adonisjs/redis/types'
import type { SessionDriverContract, SessionConfig } from '../types.js'

/**
 * File driver to read/write session to filesystem
 */
export class RedisDriver implements SessionDriverContract {
  #config: SessionConfig
  #redis: RedisManagerContract<any>
  #ttl: number

  constructor(config: SessionConfig, redis: RedisManagerContract<any>) {
    this.#config = config
    this.#redis = redis

    /**
     * Convert milliseconds to seconds
     */
    this.#ttl = Math.round(
      (typeof this.#config.age === 'string'
        ? string.milliseconds.parse(this.#config.age)
        : this.#config.age) / 1000
    )

    if (!this.#config.redisConnection) {
      throw new Exception(
        'Missing redisConnection for session redis driver inside "config/session" file',
        { code: 'E_INVALID_SESSION_DRIVER_CONFIG', status: 500 }
      )
    }
  }

  /**
   * Returns instance of the redis connection
   */
  #getRedisConnection(): RedisConnectionContract {
    return (this.#redis.connection as any)(this.#config.redisConnection)
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
   */
  async read(sessionId: string): Promise<{ [key: string]: any } | null> {
    const contents = await this.#getRedisConnection().get(sessionId)
    if (!contents) {
      return null
    }

    const verifiedContents = new MessageBuilder().verify(contents, sessionId)
    if (typeof verifiedContents !== 'object') {
      return null
    }

    return verifiedContents
  }

  /**
   * Write session values to a file
   */
  async write(sessionId: string, values: Object): Promise<void> {
    if (typeof values !== 'object') {
      throw new Error('Session file driver expects an object of values')
    }

    await this.#getRedisConnection().setex(
      sessionId,
      this.#ttl,
      new MessageBuilder().build(values, undefined, sessionId)
    )
  }

  /**
   * Cleanup session file by removing it
   */
  async destroy(sessionId: string): Promise<void> {
    await this.#getRedisConnection().del(sessionId)
  }

  /**
   * Updates the value expiry
   */
  async touch(sessionId: string): Promise<void> {
    await this.#getRedisConnection().expire(sessionId, this.#ttl)
  }
}
