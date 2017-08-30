'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Session = require('./index')
const debug = require('debug')('adonis:session')

/**
 * Session middleware is used to attach session to the
 * HTTP context.
 *
 * Also this class auto commits the session changes
 * when response is made
 *
 * @namespace Adonis/Middleware/Session
 * @group Http
 *
 * @class SessionMiddleware
 * @constructor
 */
class SessionMiddleware {
  constructor (Config, SessionManager) {
    this.Config = Config
    this.SessionManager = SessionManager
  }

  /**
   * Handle method to be executed on each request
   *
   * @method handle
   *
   * @param  {Object}   ctx
   * @param  {Function} next
   *
   * @return {void}
   */
  async handle (ctx, next) {
    const driver = this.Config.get('session.driver', 'cookie')
    debug('using %s session driver', driver)

    const driverInstance = this.SessionManager.makeDriverInstance(driver)

    if (typeof (driverInstance.setRequest) === 'function') {
      driverInstance.setRequest(ctx.request, ctx.response)
    }

    ctx.session = new Session(ctx.request, ctx.response, driverInstance, this.Config)

    /**
     * Initiate the store by reading values from the
     * driver.
     */
    await ctx.session.instantiate()

    /**
     * Sharing flash messages with the view when view
     * exists in the session and there is share
     * method on it too.
     */
    const flashMessages = ctx.session.pull('__flash__', {})

    /**
     * Add flash message to a key inside session when in
     * testing mode. This makes assertions easy.
     */
    if (process.env.NODE_ENV === 'testing') {
      ctx.session.put('__flash__old', flashMessages)
    }

    if (ctx.view && typeof (ctx.view.share) === 'function') {
      ctx.view.share({ flashMessages })
    }

    /**
     * Move the chain
     */
    await next()

    /**
     * Commit changes back to the driver.
     */
    await ctx.session.commit()
  }
}

module.exports = SessionMiddleware
