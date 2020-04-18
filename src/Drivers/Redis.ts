/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import ms from 'ms'
import { Exception, MessageBuilder } from '@poppinss/utils'
import { RedisContract } from '@ioc:Adonis/Addons/Redis'
import { SessionDriverContract, SessionConfig } from '@ioc:Adonis/Addons/Session'

/**
 * File driver to read/write session to filesystem
 */
export class RedisDriver implements SessionDriverContract {
  private ttl: number = typeof (this.config.age) === 'string' ? ms(this.config.age) : this.config.age

  constructor (
    private config: SessionConfig,
    private redis: RedisContract,
  ) {
    if (!this.config.redisConnection) {
      throw new Exception(
        'Missing redisConnection for session redis driver inside "config/session" file',
        500,
        'E_INVALID_SESSION_DRIVER_CONFIG',
      )
    }
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
   */
  public async read (sessionId: string): Promise<{ [key: string]: any } | null> {
    const contents = await this.redis.connection(this.config.redisConnection!).get(sessionId)

    const verifiedContents = new MessageBuilder().verify(contents, sessionId)
    if (typeof (verifiedContents) !== 'object') {
      return null
    }

    return verifiedContents
  }

  /**
   * Write session values to a file
   */
  public async write (sessionId: string, values: Object): Promise<void> {
    if (typeof (values) !== 'object') {
      throw new Error('Session file driver expects an object of values')
    }

    await this.redis
      .connection(this.config.redisConnection!)
      .setex(sessionId, this.ttl, new MessageBuilder().build(values, undefined, sessionId))
  }

  /**
   * Cleanup session file by removing it
   */
  public async destroy (sessionId: string): Promise<void> {
    await this.redis.connection(this.config.redisConnection!).del(sessionId)
  }

  /**
   * Updates the value expiry
   */
  public async touch (sessionId: string): Promise<void> {
    await this.redis.connection(this.config.redisConnection!).expire(sessionId, this.ttl)
  }
}
