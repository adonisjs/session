'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const GE = require('@adonisjs/generic-exceptions')
const drivers = require('./Drivers')

/**
 * The session manager class is exposed as IoC container
 * binding, which can be used to add new driver and
 * get an instance of a given driver.
 *
 * @namespace Adonis/Src/Session
 * @manager Adonis/Src/Session
 * @singleton
 * @group Http
 *
 * @class SessionManager
 */
class SessionManager {
  constructor () {
    this._drivers = {}
  }

  /**
   * Method called by ioc when someone extends the session
   * provider to add their own driver
   *
   * @method extend
   *
   * @param  {String} key
   * @param  {Class} implementation
   *
   * @return {void}
   */
  extend (key, implementation) {
    this._drivers[key] = implementation
  }

  /**
   * Makes the instance of driver
   *
   * @method makeDriverInstance
   *
   * @param  {String}           name
   *
   * @return {Object}
   */
  makeDriverInstance (name) {
    const driver = drivers[name] || this._drivers[name]
    if (!driver) {
      throw GE
        .InvalidArgumentException
        .invoke(`${name} is not a valid session provider`, 500, 'E_INVALID_SESSION_DRIVER')
    }
    return ioc.make(driver)
  }
}

module.exports = new SessionManager()
