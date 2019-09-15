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
import { CookieDriver } from '../Drivers/Cookie'
import { FileDriver } from '../Drivers/File'

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
  private _processConfig () {
    if (!this._config.clearWithBrowser) {
      const age = typeof (this._config.age) === 'string' ? ms(this._config.age) : this._config.age
      this._config.cookie.expires = new Date(Date.now() + age)
    } else {
      delete this._config.cookie.expires
    }
  }

  /**
   * Creates an instance of driver by looking at the config value `driver`.
   * An hard exception is raised in case of invalid driver name
   */
  private _createDriver (ctx): SessionDriverContract {
    if (this._config.driver === 'cookie') {
      return new CookieDriver(this._config, ctx)
    }

    if (this._config.driver === 'file') {
      return new FileDriver(this._config)
    }

    /**
     * Make extended driver when it exists
     */
    if (this._extendedDrivers.has(this._config.driver)) {
      return this._extendedDrivers.get(this._config.driver)!(this._container, this._config, ctx)
    }

    throw new Exception(
      `${this._config.driver} is not a valid session driver`,
      500,
      'E_INVALID_SESSION_DRIVER',
    )
  }

  /**
   * Creates a new session instance for a given HTTP request
   */
  public create (ctx: HttpContextContract) {
    return new Session(ctx, this._config, this._createDriver(ctx))
  }

  /**
   * Extend the drivers list by adding a new one.
   */
  public extend (driver: string, callback: SessionDriverCallback) {
    this._extendedDrivers.set(driver, callback)
  }
}
