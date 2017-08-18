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
const { memory: Driver } = require('./Drivers')
const { memoryStore } = Driver
const util = require('../../lib/util')
const Store = require('./Store')

class SessionClient {
  constructor (testRequest, Config) {
    const { options, key } = util.getCookieOption(Config)
    this._options = options
    this._key = key
    this._driverInstance = new Driver()
    this._testRequest = testRequest
    this._sessionId = uuid.v4()
    this._store = null
  }

  /**
   * Loads the data from the memory driver
   *
   * @method instantiate
   *
   * @return {void}
   */
  instantiate () {
    this._store = new Store(this._driverInstance.read(this._sessionId))
  }

  /**
   * Writes the session id as the request cookie and
   * values to the store
   *
   * @method commit
   *
   * @return {void}
   */
  commit () {
    this._testRequest.setCookie(this._key, this._sessionId)
    this._driverInstance.write(this._sessionId, JSON.stringify(this._store.toJSON()))
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
    memoryStore.clear()
  }
}

module.exports = SessionClient
