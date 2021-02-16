/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Session provider for AdonisJS
 */
export default class SessionProvider {
  constructor(protected app: ApplicationContract) {}
  public static needsApplication = true

  /**
   * Register Session Manager
   */
  public register(): void {
    this.app.container.singleton('Adonis/Addons/Session', () => {
      const { SessionManager } = require('../src/SessionManager')
      return new SessionManager(this.app, this.app.config.get('session', {}))
    })
  }

  public boot(): void {
    /**
     * Hook session into ctx during request cycle. We make use of hooks over
     * middleware, since Hooks guarantee the `after` execution even when
     * any middleware or controller raises exception.
     */
    this.app.container.withBindings(
      ['Adonis/Core/Server', 'Adonis/Core/HttpContext', 'Adonis/Addons/Session'],
      (Server, HttpContext, Session) => {
        /**
         * Sharing session with the context
         */
        HttpContext.getter(
          'session',
          function session() {
            return Session.create(this)
          },
          true
        )

        /**
         * Initiate session store
         */
        Server.hooks.before(async (ctx) => {
          await ctx.session.initiate(false)
        })

        /**
         * Commit store mutations
         */
        Server.hooks.after(async (ctx) => {
          await ctx.session.commit()
        })
      }
    )
  }
}
