/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionManager } from '../src/session_manager.js'
import type { ApplicationService } from '@adonisjs/core/types'
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
   * Register Japa API Client bindings
   */
  async #registerApiClientBindings(session: SessionManager) {
    if (this.app.getEnvironment() === 'test') {
      const { extendApiClient } = await import('../src/bindings/api_client.js')
      extendApiClient(session)
    }
  }

  /**
   * Register bindings
   */
  async boot() {
    const session = await this.app.container.make('session')

    /**
     * Add `session` getter to the HttpContext class
     */
    extendHttpContext(session)

    /**
     * Extend Japa API Client
     */
    await this.#registerApiClientBindings(session)
  }
}
