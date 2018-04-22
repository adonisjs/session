'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const uuid = require('uuid')
const debug = require('debug')('adonis:session')
const GE = require('@adonisjs/generic-exceptions')
const Store = require('./Store')
const util = require('../../lib/util')

/**
 * An instance of this class is generated automatically for
 * each request for the active driver and attached to
 * @ref('HttpContext')
 *
 * @class Session
 * @constructor
 * @group Http
 */
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
    this.freezed = false
  }

  /**
   * A boolean flag telling whether store has been
   * initiated or not
   *
   * @attribute initiated
   *
   * @return {Boolean}
   */
  get initiated () {
    return !!this._store
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
      debug('existing session found for user')
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
    this._response.cookie(this._key, sessionId, this._options)
    debug('touching session to remain active')
  }

  /**
   * Throws an exception when session store is
   * not initiated
   *
   * @method _ensureInitiated
   *
   * @return {void}
   *
   * @private
   *
   * @throws {Exception} If session store has not be initiated
   */
  _ensureInitiated () {
    if (!this.initiated) {
      throw GE
        .RuntimeException
        .invoke('Session store is not initiated yet. Make sure that you have included the session middleware inside the list of global middleware.')
    }
  }

  /**
   * Throws exception when session is freezed for modifications
   *
   * @method _ensureNotFreezed
   *
   * @return {void}
   *
   * @private
   *
   * @throws {Exception} If session is freezed
   */
  _ensureNotFreezed () {
    if (this.freezed) {
      throw GE
        .RuntimeException
        .invoke('Session store is freezed and you cannot write values to session. This usually happens during the Websocket request')
    }
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
    debug('using session id as %s', sessionId)

    /**
     * Only set session id on response when is not freezed
     */
    if (!this.freezed) {
      this._touchSessionId(sessionId)
    }

    if (this._isNewSessionId) {
      return new Store()
    }

    const sessionValue = await this._driverInstance.read(sessionId)
    debug('fetch driver session value as %j', sessionValue)
    return new Store(sessionValue)
  }

  /**
   * Instantiate session object
   *
   * @method instantiate
   *
   * @return {void}
   */
  async instantiate (freezed) {
    this.freezed = freezed
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
    if (this._store.isDirty) {
      debug('saving updates to session driver')
      await this._driverInstance.write(this._sessionId, JSON.stringify(this._store.toJSON()))
    } else {
      debug('touching session driver to keep values fresh')
      await this._driverInstance.touch(this._sessionId, JSON.stringify(this._store.toJSON()))
    }
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.put')
   */
  put (...args) {
    this._ensureInitiated()
    this._ensureNotFreezed()

    return this._store.put(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.get')
   */
  get (...args) {
    this._ensureInitiated()
    return this._store.get(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.all')
   */
  all (...args) {
    this._ensureInitiated()
    return this._store.all(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.forget')
   */
  forget (...args) {
    this._ensureInitiated()
    this._ensureNotFreezed()

    return this._store.forget(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.pull')
   */
  pull (...args) {
    this._ensureInitiated()
    this._ensureNotFreezed()

    return this._store.pull(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.increment')
   */
  increment (...args) {
    this._ensureInitiated()
    this._ensureNotFreezed()

    return this._store.increment(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.decrement')
   */
  decrement (...args) {
    this._ensureInitiated()
    this._ensureNotFreezed()

    return this._store.decrement(...args)
  }

  /* istanbul ignore next */
  /**
   * @inheritDoc('Store.clear')
   */
  clear () {
    this._ensureInitiated()
    this._ensureNotFreezed()

    this._store.clear()
  }

  /* istanbul ignore next */
  /**
   * Flash entire request object to the session
   *
   * @method flashAll
   *
   * @chainable
   */
  flashAll () {
    this._ensureNotFreezed()
    return this.flash(this._request.all())
  }

  /* istanbul ignore next */
  /**
   * Flash only selected fields from request data to
   * the session
   *
   * @method flashOnly
   *
   * @param  {...Spread} fields
   *
   * @chainable
   */
  flashOnly (...fields) {
    this._ensureNotFreezed()
    return this.flash(this._request.only(...fields))
  }

  /* istanbul ignore next */
  /**
   * Flash request data to the session except
   * certain fields
   *
   * @method flashExcept
   *
   * @param  {...Spread} fields
   *
   * @chainable
   */
  flashExcept (...fields) {
    this._ensureNotFreezed()
    return this.flash(this._request.except(...fields))
  }

  /**
   * Flash errors to the session
   *
   * @method withErrors
   *
   * @param  {Object}   errors
   *
   * @chainable
   */
  withErrors (errors) {
    this._ensureNotFreezed()
    return this.flash({ errors })
  }

  /**
   * Flash data to the session
   *
   * @method flash
   *
   * @param  {Object} data
   *
   * @chainable
   */
  flash (data) {
    if (!_.isPlainObject(data)) {
      throw GE.InvalidArgumentException.invalidParameter('Flash data should be an object', data)
    }
    const flashMessage = this.get('__flash__', null)

    if (!flashMessage) {
      this.put('__flash__', data)
    } else {
      _.merge(flashMessage, data)
    }
    return this
  }
}

module.exports = Session
