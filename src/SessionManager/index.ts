/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import ms from 'ms'
import { Exception } from '@poppinss/utils'
import { IocContract } from '@adonisjs/fold'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import {
  SessionConfigContract,
  SessionDriverContract,
  SessionDriverCallback,
  SessionManagerContract,
} from '@ioc:Adonis/Addons/Session'

import { Session } from '../Session'

/**
 * Session manager exposes the API to create session instance for a given
 * request and also add new drivers.
 */
export class SessionManager implements SessionManagerContract {
  /**
   * A private map of drivers added from outside in.
   */
  private _extendedDrivers: Map<string, SessionDriverCallback> = new Map()

  constructor (private _container: IocContract, private _config: SessionConfigContract) {
    this._processConfig()
  }

  /**
   * Processes the config and decides the `expires` option for the cookie
   */
  private _processConfig (): void {
    if (!this._config.clearWithBrowser) {
      const age = typeof (this._config.age) === 'string'
        ? ms(this._config.age)
        : this._config.age

      this._config.cookie.expires = new Date(Date.now() + age)
    } else {
      delete this._config.cookie.expires
    }
  }

  /**
   * Returns an instance of cookie driver
   */
  private _createCookieDriver (ctx: HttpContextContract): any {
    const { CookieDriver } = require('../Drivers/Cookie')
    return new CookieDriver(this._config, ctx)
  }

  /**
   * Returns an instance of file driver
   */
  private _createFileDriver (): any {
    const { FileDriver } = require('../Drivers/File')
    return new FileDriver(this._config)
  }

  /**
   * Returns an instance of redis driver
   */
  private _createRedisDriver (): any {
    const { RedisDriver } = require('../Drivers/Redis')
    return new RedisDriver(this._config, this._container.use('Adonis/Addons/Redis'))
  }

  /**
   * Creates an instance of extended driver
   */
  private _createExtendedDriver (ctx: HttpContextContract): any {
    if (!this._extendedDrivers.has(this._config.driver)) {
      throw new Exception(
        `${this._config.driver} is not a valid session driver`,
        500,
        'E_INVALID_SESSION_DRIVER',
      )
    }

    return this._extendedDrivers.get(this._config.driver)!(this._container, this._config, ctx)
  }

  /**
   * Creates an instance of driver by looking at the config value `driver`.
   * An hard exception is raised in case of invalid driver name
   */
  private _createDriver (ctx: HttpContextContract): SessionDriverContract {
    switch (this._config.driver) {
      case 'cookie':
        return this._createCookieDriver(ctx)
      case 'file':
        return this._createFileDriver()
      case 'redis':
        return this._createRedisDriver()
      default:
        return this._createExtendedDriver(ctx)
    }
  }

  /**
   * Creates a new session instance for a given HTTP request
   */
  public create (ctx: HttpContextContract): Session {
    return new Session(ctx, this._config, this._createDriver(ctx))
  }

  /**
   * Extend the drivers list by adding a new one.
   */
  public extend (driver: string, callback: SessionDriverCallback): void {
    this._extendedDrivers.set(driver, callback)
  }
}
