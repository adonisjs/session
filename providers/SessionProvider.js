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
  /**
   * Registers manager under `Adonis/Src/Session`
   * namespace
   *
   * @method _registerManager
   *
   * @return {void}
   *
   * @private
   */
  _registerManager () {
    this.app.manager('Adonis/Src/Session', require('../src/Session/Manager'))
  }

  /**
   * Registers provider under `Adonis/Src/Session`
   * namespace.
   *
   * @method _registerProvider
   *
   * @return {void}
   *
   * @private
   */
  _registerProvider () {
    this.app.bind('Adonis/Src/Session', () => {
      return require('../src/Session/Manager')
    })
  }

  /**
   * Registers the session client under `Adonis/Clients/Session`
   * namespace
   *
   * @method _registerClient
   *
   * @return {void}
   */
  _registerClient () {
    this.app.bind('Adonis/Clients/Session', () => {
      return require('../src/Session/Client')
    })
  }

  /**
   * Register the middleware under `Adonis/Middleware/Session`
   * namespace
   *
   * @method _registerMiddleware
   *
   * @return {void}
   *
   * @private
   */
  _registerMiddleware () {
    this.app.bind('Adonis/Middleware/Session', (app) => {
      const SessionMiddleware = require('../src/Session/Middleware')
      return new SessionMiddleware(app.use('Adonis/Src/Config'), app.use('Adonis/Src/Session'))
    })
  }

  /**
   * Register method called by ioc container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this._registerManager()
    this._registerProvider()
    this._registerClient()
    this._registerMiddleware()
  }

  boot () {
    try {
      require('../src/Session/FlashGlobals')(this.app.use('Adonis/Src/View'))
    } catch (error) {}
  }
}

module.exports = SessionProvider
