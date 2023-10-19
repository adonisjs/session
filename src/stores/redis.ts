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
import type { SessionStoreContract, SessionData } from '../types.js'

/**
 * File store to read/write session to filesystem
 */
export class RedisStore implements SessionStoreContract {
  #connection: Connection
  #ttlSeconds: number

  constructor(connection: Connection, age: string | number) {
    this.#connection = connection
    this.#ttlSeconds = string.seconds.parse(age)
    debug('initiating redis store')
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
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
   * Write session values to a file
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('redis store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    await this.#connection.setex(sessionId, this.#ttlSeconds, message)
  }

  /**
   * Cleanup session file by removing it
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
}
