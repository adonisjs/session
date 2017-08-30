'use strict'

/*
 * adonis-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * The session client is a implementation of session but
 * to be used as a client. It is helpful when you want
 * to generate sessions from client and want them to
 * be available to server.
 *
 * The driver always has to be `memory`.
 */

const uuid = require('uuid')
const Store = require('./Store')
const util = require('../../lib/util')

/**
 * Session client to set sessions as
 * cookies.
 *
 * @constructor
 * @class SessionClient
 */
class SessionClient {
  constructor (Config, cookies) {
    cookies = cookies || {}
    const { key } = util.getCookieOption(Config)
    const sessionValues = cookies[`${key}-values`] || null

    this._sessionId = uuid.v4()
    this._key = key
    this._store = sessionValues ? new Store(sessionValues) : new Store()
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.put')
   */
  put (...args) {
    return this._store.put(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.get')
   */
  get (...args) {
    return this._store.get(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.all')
   */
  all (...args) {
    return this._store.all(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.forget')
   */
  forget (...args) {
    return this._store.forget(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.pull')
   */
  pull (...args) {
    return this._store.pull(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.increment')
   */
  increment (...args) {
    return this._store.increment(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.decrement')
   */
  decrement (...args) {
    return this._store.decrement(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.clear')
   */
  clear () {
    this._store.clear()
  }

  /**
   * Returns an object with keys and values
   * to be set as cookies
   *
   * @method toJSON
   *
   * @return {Array}
   */
  toJSON () {
    return [
      {
        key: this._key,
        value: this._sessionId
      },
      {
        key: `${this._key}-values`,
        value: JSON.stringify(this._store.toJSON())
      }
    ]
  }
}

module.exports = SessionClient
