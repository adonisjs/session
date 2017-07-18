'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const drivers = require('./Drivers')
const { ioc } = require('@adonisjs/fold')

/**
 * Session manager class is used by ioc container
 * to allow adding new drivers.
 *
 * @class SessionManager
 * @constructor
 *
 * @namespace Adonis/Src/Session
 * @singleton
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
      throw new Error(`${name} is not valid session driver`)
    }
    return ioc.make(driver)
  }
}

module.exports = new SessionManager()
