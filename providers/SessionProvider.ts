/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ServerContract } from '@ioc:Adonis/Core/Server'
import { HttpContextConstructorContract } from '@ioc:Adonis/Core/HttpContext'
import { SessionManager } from '../src/SessionManager'

/**
 * Session provider for AdonisJs
 */
export default class SessionProvider {
  constructor (protected $container: any) {}

  public register (): void {
    this.$container.singleton('Adonis/Addons/SessionManager', () => {
      const Config = this.$container.use('Adonis/Core/Config')
      return new SessionManager(this.$container, Config.get('session'))
    })
  }

  public boot (): void {
    /**
     * Hook session into ctx during request cycle. We make use of
     * hooks over middleware, since Hooks guarantee the `after`
     * execution even when any middleware or controller raises
     * exception.
     */
    this.$container.with([
      'Adonis/Core/Server',
      'Adonis/Core/HttpContext',
      'Adonis/Addons/SessionManager',
    ], (Server: ServerContract, HttpContext: HttpContextConstructorContract, Session: SessionManager) => {
      /**
       * Sharing session with the context
       */
      HttpContext.getter('session', function session () {
        return Session.create(this)
      }, true)

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
    })
  }
}
