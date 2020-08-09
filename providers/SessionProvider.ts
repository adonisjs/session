/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ServerContract } from '@ioc:Adonis/Core/Server'
import { SessionManagerContract } from '@ioc:Adonis/Addons/Session'
import { HttpContextConstructorContract } from '@ioc:Adonis/Core/HttpContext'

/**
 * Session provider for AdonisJS
 */
export default class SessionProvider {
	constructor(protected container: any) {}

	/**
	 * Register Session Manager
	 */
	public register(): void {
		this.container.singleton('Adonis/Addons/Session', () => {
			const Config = this.container.use('Adonis/Core/Config')
			const { SessionManager } = require('../src/SessionManager')
			return new SessionManager(this.container, Config.get('session', {}))
		})
	}

	public boot(): void {
		/**
		 * Hook session into ctx during request cycle. We make use of hooks over
		 * middleware, since Hooks guarantee the `after` execution even when
		 * any middleware or controller raises exception.
		 */
		this.container.with(
			['Adonis/Core/Server', 'Adonis/Core/HttpContext', 'Adonis/Addons/Session'],
			(
				Server: ServerContract,
				HttpContext: HttpContextConstructorContract,
				Session: SessionManagerContract
			) => {
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
