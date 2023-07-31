/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { registerSessionDriver } from '../src/helpers.js'
import SessionMiddleware from '../src/session_middleware.js'

/**
 * Session provider configures the session management inside an
 * AdonisJS application
 */
export default class SessionProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(SessionMiddleware, async (resolver) => {
      const config = this.app.config.get<any>('session', {})
      const emitter = await resolver.make('emitter')
      return new SessionMiddleware(config, emitter)
    })
  }

  async boot() {
    this.app.container.resolving(SessionMiddleware, async () => {
      const config = this.app.config.get<any>('session')
      await registerSessionDriver(this.app, config.driver)
    })
  }
}
