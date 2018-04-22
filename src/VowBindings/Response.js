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
const SessionClient = require('../Session/Client')

/**
 * Response session class is used to
 * pull session details from a
 * vow response
 *
 * @class ResponseSession
 * @constructor
 */
class ResponseSession {
  constructor (client, assert) {
    this.client = client
    this._assert = assert
  }

  /**
   * Returns the value of a given key from
   * the session store
   *
   * @method get
   *
   * @param  {String} key
   * @param  {Mixed} defaultValue
   *
   * @return {Mixed}
   */
  get (key, defaultValue) {
    return this.client.get(key, defaultValue)
  }

  /**
   * Returns all flash messages from the session
   * store
   *
   * @method flashMessages
   *
   * @return {Object}
   */
  flashMessages () {
    return this.get('__flash__old', {})
  }

  /**
   * Returns value for a given key from the session
   * store
   *
   * @method old
   *
   * @param  {String} key
   * @param  {Mixed} defaultValue
   *
   * @return {Mixed}
   */
  old (key, defaultValue) {
    return _.get(this.flashMessages(), key, defaultValue)
  }

  /**
   * Returns an array of errors
   *
   * @method errors
   *
   * @return {Array}
   */
  errors () {
    return this.old('errors')
  }

  /**
   * Returns error for a given key
   *
   * @method getErrorFor
   *
   * @param  {String}    key
   *
   * @return {String|Null}
   */
  getErrorFor (key) {
    const errors = this.errors()

    /**
     * If errors is an object and not an array
     * then return the value for the key
     */
    if (_.isPlainObject(errors)) {
      return _.get(errors, key)
    }

    /**
     * Otherwise look inside array assuming validation
     * error structure
     */
    const errorMessage = _.find(errors, (error) => error.field === key || error.fieldName === key)
    return errorMessage ? errorMessage.message : null
  }

  /**
   * Returns a boolean indicating there is an error or
   * not
   *
   * @method hasErrorFor
   *
   * @param  {String}    key
   *
   * @return {Boolean}
   */
  hasErrorFor (key) {
    return !!this.getErrorFor(key)
  }

  /**
   * Asserts the error value for a given key
   *
   * @method assertHasError
   *
   * @param  {String}       key
   * @param  {String}       message
   *
   * @chainable
   */
  assertError (key, message) {
    this._assert.deepEqual(this.getErrorFor(key), message)
    return this
  }

  /**
   * Asserts that error exists for a given key
   *
   * @method assertErrorExists
   *
   * @param  {String}          key
   *
   * @chainable
   */
  assertErrorExists (key) {
    this._assert.isTrue(this.hasErrorFor(key), `There are no errors for the ${key} field`)
    return this
  }

  /**
   * Asserts that error doesn't exists for a given key
   *
   * @method assertErrorNotExists
   *
   * @param  {String}          key
   *
   * @chainable
   */
  assertErrorNotExists (key) {
    this._assert.isFalse(this.hasErrorFor(key), `There is an error for the ${key} field`)
    return this
  }

  /**
   * Assert on session value
   *
   * @method assertValue
   *
   * @param  {String}    key
   * @param  {Mixed}    value
   *
   * @chainable
   */
  assertValue (key, value) {
    this._assert.deepEqual(this.get(key), value)
    return this
  }

  /**
   * Assets value of flash message for a given
   * key
   *
   * @method assertOld
   *
   * @param  {String}  key
   * @param  {Mixed}  value
   *
   * @chainable
   */
  assertOld (key, value) {
    this._assert.deepEqual(this.old(key), value)
    return this
  }

  /**
   * Asserts value for given key exists inside the
   * flash messages
   *
   * @method assertOldExists
   *
   * @param  {String}        key
   *
   * @chainable
   */
  assertOldExists (key) {
    this._assert.isTrue(!!this.old(key))
    return this
  }
}

module.exports = function (Response, Config) {
  /**
   * A Response macro to read session values
   */
  Response.getter('session', function () {
    return new ResponseSession(new SessionClient(Config, this.cookies), this._assert)
  }, true)
}
