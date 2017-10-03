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

module.exports = function (View) {
  View.global('old', function (key, defaultValue) {
    return _.get(this.resolve('flashMessages'), key, defaultValue)
  })

  View.global('flashMessage', function (key, defaultValue) {
    return this.resolve('old')(key, defaultValue)
  })

  View.global('errors', function () {
    return this.resolve('old')('errors')
  })

  View.global('hasErrors', function (key) {
    return !!_.size(this.resolve('errors')())
  })

  View.global('getErrorFor', function (key) {
    const errors = this.resolve('errors')()

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
  })

  View.global('hasErrorFor', function (key) {
    return !!this.resolve('getErrorFor')(key)
  })
}
