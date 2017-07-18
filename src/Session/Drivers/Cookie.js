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

class Cookie {
  constructor (Config) {
    const { options, key } = util.getCookieOption(Config, 'values')

    this._request = null
    this._response = null
    this._options = options
    this._key = key
  }

  /**
   * A driver indicates whether it has stale values or not. Stale
   * values are created when values are not stored next to a
   * given session id and upon changing the session id, old
   * values must be treated stale.
   *
   * Ofcourse cookie driver can store session values next to a given
   * unique id but that will increase the cookie size and it is not
   * a right thing to do.
   *
   * @attribute hasStaleValues
   *
   * @return {Boolean}
   */
  get hasStaleValues () {
    return true
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
   * @param  {Object} values
   *
   * @return {void}
   */
  touch (values) {
    /**
     * If cookie is supposed to be closed on browser close,
     * then there is no need to touch it.
     */
    if (this._options.expires || this._options.maxAge) {
      this._response.cookie(this._key, values, this._options)
    }
  }
}

module.exports = Cookie
