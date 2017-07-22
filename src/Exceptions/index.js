'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const NE = require('node-exceptions')

class InvalidArgumentException extends NE.InvalidArgumentException {
  static invalidSessionDriver (name) {
    return new this(`${name} is not a valid session provider`, 500, 'E_INVALID_SESSION_DRIVER')
  }
}

module.exports = { InvalidArgumentException }
