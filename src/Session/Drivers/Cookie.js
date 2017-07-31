'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
const util = require('../../../lib/util')

/**
 * Cookie driver to save session values to the
 * cookie.
 *
 * @class Cookie
 * @constructor
 */
class Cookie {
  /* istanbul ignore next */
  /**
   * Namespaces to inject
   *
   * @attribute inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Config']
  }

  constructor (Config) {
    const { options, key } = util.getCookieOption(Config, 'values')
    this._request = null
    this._response = null
    this._options = options
    this._key = key
  }

  /**
   * Set request and response objects for the current
   * request
   *
   * @method setRequest
   *
   * @param  {Object}   request
   * @param  {Object}   response
   */
  setRequest (request, response) {
    this._request = request
    this._response = response
  }

  /**
   * Read values from cookies
   *
   * @param  {String} sessionId
   *
   * @method read
   *
   * @return {Object}
   */
  read () {
    return this._request.cookie(this._key)
  }

  /**
   * Write cookie values
   *
   * @method write
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  write (sessionId, values) {
    this._response.cookie(this._key, values, this._options)
  }

  /**
   * Touching the cookies by resetting it. There is no way
   * to just update the expires time on the cookie
   *
   * @method touch
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  touch (sessionId, values) {
    this.write(sessionId, values)
  }
}

module.exports = Cookie
