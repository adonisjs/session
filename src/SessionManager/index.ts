/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { IocContract } from '@adonisjs/fold'
import { HttpContextContract } from '@poppinss/http-server'
import { Exception } from '@poppinss/utils'

import {
  SessionConfigContract,
  SessionDriverContract,
  SessionDriverCallback,
  SessionManagerContract,
} from '@ioc:Adonis/Addons/Session'

import { Session } from '../Session'
import { CookieDriver } from '../Drivers/Cookie'

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
  }

  /**
   * Creates an instance of driver by looking at the config value `driver`.
   * An hard exception is raised in case of invalid driver name
   */
  private _createDriver (ctx): SessionDriverContract {
    if (this._config.driver === 'cookie') {
      return new CookieDriver(this._config, ctx)
    }

    /**
     * Make extended driver when it exists
     */
    if (this._extendedDrivers.has(this._config.driver)) {
      return this._extendedDrivers.get(this._config.driver)!(this._container, this._config,ctx)
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
    return new Session(this._config, ctx, this._createDriver(ctx))
  }

  /**
   * Extend the drivers list by adding a new one.
   */
  public extend (driver: string, callback: SessionDriverCallback) {
    this._extendedDrivers.set(driver, callback)
  }
}
