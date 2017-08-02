'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')

module.exports = async function (cli) {
  try {
    await cli.makeConfig('session.js', path.join(__dirname, './templates/config.mustache'))
    cli.command.complete('create', 'config/session.js')
  } catch (error) {
    // ignore if session.js already exists
  }
}
