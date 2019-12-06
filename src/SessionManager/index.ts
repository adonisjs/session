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
  private extendedDrivers: Map<string, SessionDriverCallback> = new Map()

  constructor (private container: IocContract, private config: SessionConfigContract) {
    this.processConfig()
  }

  /**
   * Processes the config and decides the `expires` option for the cookie
   */
  private processConfig (): void {
    if (!this.config.clearWithBrowser) {
      const age = typeof (this.config.age) === 'string'
        ? ms(this.config.age)
        : this.config.age

      this.config.cookie.expires = new Date(Date.now() + age)
    } else {
      delete this.config.cookie.expires
    }
  }

  /**
   * Returns an instance of cookie driver
   */
  private createCookieDriver (ctx: HttpContextContract): any {
    const { CookieDriver } = require('../Drivers/Cookie')
    return new CookieDriver(this.config, ctx)
  }

  /**
   * Returns an instance of file driver
   */
  private createFileDriver (): any {
    const { FileDriver } = require('../Drivers/File')
    return new FileDriver(this.config)
  }

  /**
   * Returns an instance of redis driver
   */
  private createRedisDriver (): any {
    const { RedisDriver } = require('../Drivers/Redis')
    return new RedisDriver(this.config, this.container.use('Adonis/Addons/Redis'))
  }

  /**
   * Creates an instance of extended driver
   */
  private createExtendedDriver (ctx: HttpContextContract): any {
    if (!this.extendedDrivers.has(this.config.driver)) {
      throw new Exception(
        `${this.config.driver} is not a valid session driver`,
        500,
        'E_INVALID_SESSION_DRIVER',
      )
    }

    return this.extendedDrivers.get(this.config.driver)!(this.container, this.config, ctx)
  }

  /**
   * Creates an instance of driver by looking at the config value `driver`.
   * An hard exception is raised in case of invalid driver name
   */
  private _createDriver (ctx: HttpContextContract): SessionDriverContract {
    switch (this.config.driver) {
      case 'cookie':
        return this.createCookieDriver(ctx)
      case 'file':
        return this.createFileDriver()
      case 'redis':
        return this.createRedisDriver()
      default:
        return this.createExtendedDriver(ctx)
    }
  }

  /**
   * Creates a new session instance for a given HTTP request
   */
  public create (ctx: HttpContextContract): Session {
    return new Session(ctx, this.config, this._createDriver(ctx))
  }

  /**
   * Extend the drivers list by adding a new one.
   */
  public extend (driver: string, callback: SessionDriverCallback): void {
    this.extendedDrivers.set(driver, callback)
  }
}
