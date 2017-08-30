'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const SessionClient = require('../Session/Client')

module.exports = function (Request, Config) {
  /**
   * A request getter to set session client on the
   * request.
   */
  Request.getter('_session', function () {
    return new SessionClient(Config)
  }, true)

  /**
   * A request macro to set session when making
   * requests
   */
  Request.macro('session', function (key, value) {
    this._session.put(key, value)
    return this
  })

  /* istanbul ignore next */
  /**
   * Adding session as cookie before request
   * is executed
   */
  Request.before((requestInstance) => {
    requestInstance._session.toJSON().forEach((item) => {
      requestInstance.cookie(item.key, item.value)
    })
  })
}
