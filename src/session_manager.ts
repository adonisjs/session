/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { Exception } from '@poppinss/utils'

import { Session } from './session.js'
import { CookieClient, HttpContext } from '@adonisjs/core/http'
import { CookieDriver } from './drivers/cookie.js'
import { MemoryDriver } from './drivers/memory.js'
import { FileDriver } from './drivers/file.js'
import { RedisDriver } from './drivers/redis.js'
import { ExtendCallback, SessionConfig, SessionDriverContract } from './types.js'
import { RedisManagerContract } from '@adonisjs/redis/types'
import { Encryption } from '@adonisjs/core/encryption'
import { SessionClient } from './client.js'

type SessionManagerConfig = SessionConfig & {
  cookie: {
    expires: undefined
    maxAge: number | undefined
  }
}

/**
 * Session manager exposes the API to create session instance for a given
 * request and also add new drivers.
 */
export class SessionManager {
  /**
   * A private map of drivers added from outside in.
   */
  #extendedDrivers: Map<string, ExtendCallback> = new Map()

  /**
   * Reference to session config
   */
  #config!: SessionManagerConfig

  /**
   * Reference to the encryption instance
   */
  #encryption: Encryption

  /**
   * Reference to the redis manager
   */
  #redis?: RedisManagerContract<any>

  constructor(config: SessionConfig, encryption: Encryption, redis?: RedisManagerContract<any>) {
    this.#encryption = encryption
    this.#redis = redis

    this.#processConfig(config)
  }

  /**
   * Processes the config and decides the `expires` option for the cookie
   */
  #processConfig(config: SessionConfig): void {
    /**
     * Explicitly overwriting `cookie.expires` and `cookie.maxAge` from
     * the user defined config
     */
    const processedConfig: SessionManagerConfig = Object.assign({ enabled: true }, config, {
      cookie: {
        ...config.cookie,
        expires: undefined,
        maxAge: undefined,
      },
    })

    /**
     * Set the max age when `clearWithBrowser = false`. Otherwise cookie
     * is a session cookie
     */
    if (!processedConfig.clearWithBrowser) {
      const age =
        typeof processedConfig.age === 'string'
          ? Math.round(string.milliseconds.parse(processedConfig.age) / 1000)
          : processedConfig.age

      processedConfig.cookie.maxAge = age
    }

    this.#config = processedConfig
  }

  /**
   * Returns an instance of cookie driver
   */
  #createCookieDriver(ctx: HttpContext) {
    return new CookieDriver(this.#config, ctx)
  }

  /**
   * Returns an instance of the memory driver
   */
  #createMemoryDriver() {
    return new MemoryDriver()
  }

  /**
   * Returns an instance of file driver
   */
  #createFileDriver() {
    return new FileDriver(this.#config)
  }

  /**
   * Returns an instance of redis driver
   */
  #createRedisDriver() {
    if (!this.#redis) {
      throw new Error(
        'Install "@adonisjs/redis" in order to use the redis driver for storing sessions'
      )
    }

    return new RedisDriver(this.#config, this.#redis)
  }

  /**
   * Creates an instance of extended driver
   */
  #createExtendedDriver(ctx: HttpContext): any {
    if (!this.#extendedDrivers.has(this.#config.driver)) {
      throw new Exception(`"${this.#config.driver}" is not a valid session driver`, {
        code: 'E_INVALID_SESSION_DRIVER',
        status: 500,
      })
    }

    return this.#extendedDrivers.get(this.#config.driver)!(this, this.#config, ctx)
  }

  #createDriver(ctx: HttpContext): SessionDriverContract {
    switch (this.#config.driver) {
      case 'cookie':
        return this.#createCookieDriver(ctx)
      case 'file':
        return this.#createFileDriver()
      case 'redis':
        return this.#createRedisDriver()
      case 'memory':
        return this.#createMemoryDriver()
      default:
        return this.#createExtendedDriver(ctx)
    }
  }

  /**
   * Find if the sessions are enabled
   */
  isEnabled() {
    return this.#config.enabled
  }

  /**
   * Creates an instance of the session client
   */
  client() {
    const cookieClient = new CookieClient(this.#encryption)

    return new SessionClient(this.#config, this.#createMemoryDriver(), cookieClient, {})
  }

  /**
   * Creates a new session instance for a given HTTP request
   */
  create(ctx: HttpContext) {
    return new Session(ctx, this.#config, this.#createDriver(ctx))
  }

  /**
   * Extend the drivers list by adding a new one.
   */
  extend(driver: string, callback: ExtendCallback): void {
    this.#extendedDrivers.set(driver, callback)
  }
}
