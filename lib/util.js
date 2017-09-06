'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ms = require('ms')
const util = exports = module.exports = {}

util.getCookieOption = function (Config, keyPrefix = null) {
  /**
   * Key to store session values
   *
   * @type {String}
   */
  const key = `${Config.get('session.cookieName', 'adonis-session')}`

  /**
   * Cookie options
   *
   * @type {Object}
   */
  const options = Config.merge('session.cookie', {
    httpOnly: true,
    sameSite: false
  })

  /**
   * We need to set the expires option only when clearWithBrowser
   * is set to false.
   */
  if (!Config.get('session.clearWithBrowser', false)) {
    let age = Config.get('session.age', '2 hrs')
    age = typeof (age) === 'number' ? age : ms(age)
    options.expires = new Date(Date.now() + age)
  }

  return { options, key: keyPrefix ? `${key}-${keyPrefix}` : key }
}
