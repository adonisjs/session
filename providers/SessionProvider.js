'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')

class SessionProvider extends ServiceProvider {
  register () {
    this.app.singleton('Adonis/Middleware/Session', (app) => {
      const SessionMiddleware = require('../src/Session/Middleware')
      return new SessionMiddleware(app.use('Adonis/Src/Config'))
    })
  }
}

module.exports = SessionProvider
