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
 * Session middleware to be used on each request
 * to enable sessions.
 *
 * This class will instance will be accessed via
 * HTTP context.
 *
 * @namespace Adonis/Middleware/Session
 * @uses (['Adonis/Src/Config'])
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
