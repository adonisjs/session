/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SessionManager } from '../src/SessionManager'

/**
 * Session provider for AdonisJs
 */
export default class SessionProvider {
  constructor (protected $container: any) {}

  public register () {
    this.$container.singleton('Adonis/Addons/SessionManager', () => {
      const Config = this.$container.use('Adonis/Core/Config')
      return new SessionManager(this.$container, Config.get('session'))
    })
  }

  public boot () {
    /**
     * Hook session into ctx during request cycle. We make use of hooks over middleware,
     * since Hooks guarantee the `after` execution even when any middleware or
     * controller raises exception.
     */
    this.$container.with(['Adonis/Core/Server', 'Adonis/Addons/SessionManager'], (Server, Session) => {
      Server.before(async (ctx) => {
        ctx.session = Session.create(ctx)
        await ctx.session.initiate(false)
      })

      Server.after(async (ctx) => {
        await ctx.session.commit()
      })
    })
  }
}
