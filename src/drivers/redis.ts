/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { MessageBuilder } from '@poppinss/utils'
import type { RedisService } from '@adonisjs/redis/types'

import type { SessionDriverContract, RedisDriverConfig, SessionData } from '../types/main.js'

/**
 * File driver to read/write session to filesystem
 */
export class RedisDriver implements SessionDriverContract {
  #config: RedisDriverConfig
  #redis: RedisService
  #ttlSeconds: number

  constructor(redis: RedisService, config: RedisDriverConfig, age: string | number) {
    this.#config = config
    this.#redis = redis
    this.#ttlSeconds = string.seconds.parse(age)
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
   */
  async read(sessionId: string): Promise<SessionData | null> {
    const contents = await this.#redis.connection(this.#config.connection).get(sessionId)
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
   * Write session values to a file
   */
  async write(sessionId: string, values: Object): Promise<void> {
    const message = new MessageBuilder().build(values, undefined, sessionId)
    await this.#redis
      .connection(this.#config.connection)
      .setex(sessionId, this.#ttlSeconds, message)
  }

  /**
   * Cleanup session file by removing it
   */
  async destroy(sessionId: string): Promise<void> {
    await this.#redis.connection(this.#config.connection).del(sessionId)
  }

  /**
   * Updates the value expiry
   */
  async touch(sessionId: string): Promise<void> {
    await this.#redis.connection(this.#config.connection).expire(sessionId, this.#ttlSeconds)
  }
}
