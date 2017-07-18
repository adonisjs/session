'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const util = require('../../lib/util')
const Store = require('./Store')
const uuid = require('uuid')

class Session {
  constructor (request, response, driverInstance, Config) {
    const { options, key } = util.getCookieOption(Config)
    this._request = request
    this._response = response
    this._driverInstance = driverInstance
    this._isNewSessionId = true
    this._options = options
    this._key = key
    this._store = null
    this._sessionId = null
  }

  /**
   * Returns a unique session id for the given
   * session.
   *
   * @method _getSessionId
   *
   * @return {String}
   *
   * @private
   */
  _getSessionId () {
    const existingSessionId = this._request.cookie(this._key)
    if (existingSessionId) {
      this._isNewSessionId = false
      return existingSessionId
    }
    return uuid.v4()
  }

  /**
   * Touches the session cookie to make sure it stays
   * alive
   *
   * @method _touchSessionId
   *
   * @param  {String}        sessionId
   *
   * @return {void}
   *
   * @private
   */
  _touchSessionId (sessionId) {
    this._sessionId = sessionId
    this._response.cookie(this._key, sessionId)
  }

  /**
   * Returns an instance of store with existing values
   * for a given session or empty store if session
   * is newly created
   *
   * @method _getValues
   *
   * @return {Store}
   *
   * @private
   */
  async _getValues () {
    const sessionId = this._getSessionId()
    this._touchSessionId(sessionId)

    if (this._isNewSessionId) {
      return new Store()
    }

    const sessionValue = await this._driverInstance.read(sessionId)
    return new Store(sessionValue)
  }

  /**
   * Instantiate session object
   *
   * @method instantiate
   *
   * @return {void}
   */
  async instantiate () {
    this._store = await this._getValues()
  }

  /**
   * Saves the final set of session values to the
   * driver instance
   *
   * @method commit
   *
   * @return {void}
   */
  async commit () {
    await this._driverInstance.write(this._sessionId, this._store.toJSON())
  }

  /**
   * @inheritDoc('Store.put')
   */
  put (...args) {
    return this._store.put(...args)
  }

  /**
   * @inheritDoc('Store.get')
   */
  get (...args) {
    return this._store.get(...args)
  }

  /**
   * @inheritDoc('Store.all')
   */
  all (...args) {
    return this._store.all(...args)
  }

  /**
   * @inheritDoc('Store.forget')
   */
  forget (...args) {
    return this._store.forget(...args)
  }

  /**
   * @inheritDoc('Store.pull')
   */
  pull (...args) {
    return this._store.pull(...args)
  }

  /**
   * @inheritDoc('Store.increment')
   */
  increment (...args) {
    return this._store.increment(...args)
  }

  /**
   * @inheritDoc('Store.decrement')
   */
  decrement (...args) {
    return this._store.decrement(...args)
  }

  /**
   * @inheritDoc('Store.clear')
   */
  clear () {
    this._store.clear()
  }
}

module.exports = Session
