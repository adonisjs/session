'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const debug = require('debug')('adonis:session')

module.exports = function getRequestInstance (request, response, Config, SessionManager) {
  const driver = Config.get('session.driver', 'cookie')
  debug('using %s driver', driver)

  const driverInstance = SessionManager.makeDriverInstance(driver)

  if (typeof (driverInstance.setRequest) === 'function') {
    driverInstance.setRequest(request, response)
  }

  const Session = require('./index')
  return new Session(request, response, driverInstance, Config)
}
