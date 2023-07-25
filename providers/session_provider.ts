/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationService } from '@adonisjs/core/types'
import { extendHttpContext } from '../src/bindings/http_context.js'
import SessionMiddleware from '../src/session_middleware.js'

export default class SessionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register Session Manager in the container
   */
  async register() {
    this.app.container.singleton('session', async () => {
      const { SessionManager } = await import('../src/session_manager.js')

      const encryption = await this.app.container.make('encryption')
      const redis = await this.app.container.make('redis').catch(() => undefined)
      const config = this.app.config.get<any>('session', {})

      return new SessionManager(config, encryption, redis)
    })

    this.app.container.bind(SessionMiddleware, async () => {
      const session = await this.app.container.make('session')
      return new SessionMiddleware(session)
    })
  }

  /**
   * Register bindings
   */
  async boot() {
    const sessionManager = await this.app.container.make('session')

    /**
     * Add `session` getter to the HttpContext class
     */
    extendHttpContext(sessionManager)

    if (this.app.getEnvironment() === 'test') {
      // Lazy-load to avoid pulling `@japa/api-client` and its dependencies unless necessary.
      const { extendApiClient } = await import('../src/bindings/api_client.js')

      /**
       * Add some macros and getter to japa/api-client classes for
       * easier testing
       */
      extendApiClient(sessionManager)
    }
  }
}
