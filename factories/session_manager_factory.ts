/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionConfig } from '../src/types.js'
import type { Application } from '@adonisjs/application'
import type { RedisConnectionConfig } from '@adonisjs/redis/types'
import { EncryptionFactory } from '@adonisjs/core/factories/encryption'
import { SessionManager } from '../src/session_manager.js'
import { RedisManagerFactory } from '@adonisjs/redis/factories'

/**
 * Session Manager Factory is used to create an instance of
 * session manager for testing
 */
export class SessionManagerFactory {
  /**
   * Default configuration for the session manager
   */
  #options: SessionConfig = {
    enabled: true,
    driver: 'cookie',
    cookieName: 'adonis-session',
    clearWithBrowser: false,
    age: 3000,
    cookie: { path: '/' },
  }

  /**
   * Configuration for the redis manager
   */
  #redisManagerOptions = {
    connection: 'local',
    connections: { local: { host: '127.0.0.1', port: 6379, } }
  } as const

  /**
   * Merge factory parameters
   */
  merge(options: SessionConfig) {
    this.#options = Object.assign(this.#options, options)
    return this
  }

  /**
   * Merge redis manager parameters
   */
  mergeRedisManagerOptions<Connections extends Record<string, RedisConnectionConfig>>(options: {
    connection: keyof Connections,
    connections: Connections,
  }
  ) {
    this.#redisManagerOptions = Object.assign(this.#redisManagerOptions, options)
    return this
  }

  /**
   * Create Session manager instance
   */
  create(app: Application<any>) {
    return new SessionManager(this.#options,
      new EncryptionFactory().create(),
      new RedisManagerFactory(this.#redisManagerOptions).create(app),
    )
  }
}
