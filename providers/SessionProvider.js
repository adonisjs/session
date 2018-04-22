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
   * Register the vow trait to bind session client
   * under `Adonis/Traits/Session` namespace.
   *
   * @method _registerVowTrait
   *
   * @return {void}
   */
  _registerVowTrait () {
    this.app.bind('Adonis/Traits/Session', (app) => {
      const Config = app.use('Adonis/Src/Config')
      return ({ Request, Response }) => {
        require('../src/VowBindings/Request')(Request, Config)
        require('../src/VowBindings/Response')(Response, Config)
      }
    })
    this.app.alias('Adonis/Traits/Session', 'Session/Client')
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
    this._registerVowTrait()
  }

  /**
   * Boot the provider
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    const HttpContext = this.app.use('Adonis/Src/HttpContext')
    const Config = this.app.use('Adonis/Src/Config')
    const SessionManager = this.app.use('Adonis/Src/Session')

    /**
     * Adding getter to the HTTP context. Please note the session
     * store is not initialized yet and middleware must be
     * executed before the session store can be used
     * for fetching or setting data.
     */
    HttpContext.getter('session', function () {
      return require('../src/Session/getRequestInstance')(this.request, this.response, Config, SessionManager)
    }, true)

    /**
     * Since Websocket is optional, we need to wrap the use
     * statement inside a try/catch and if user is using
     * websocket connection, we will initiate sessions
     * for them
     */
    try {
      const WsContext = this.app.use('Adonis/Addons/WsContext')
      WsContext.getter('session', function () {
        return require('../src/Session/getRequestInstance')(this.request, this.response, Config, SessionManager)
      }, true)
    } catch (error) {}

    /**
     * Adding flash globals to the view layer, only when it is in use
     */
    try {
      require('../src/Session/FlashGlobals')(this.app.use('Adonis/Src/View'))
    } catch (error) {}
  }
}

module.exports = SessionProvider
