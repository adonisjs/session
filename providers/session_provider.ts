/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Edge } from 'edge.js'
import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@poppinss/utils'
import type { ApplicationService } from '@adonisjs/core/types'

import type { Session } from '../src/session.js'
import SessionMiddleware from '../src/session_middleware.js'

/**
 * Events emitted by the session class
 */
declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:initiated': { session: Session }
    'session:committed': { session: Session }
    'session:migrated': { fromSessionId: string; toSessionId: string; session: Session }
  }
}

/**
 * Session provider configures the session management inside an
 * AdonisJS application
 */
export default class SessionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registers edge plugin when edge is installed
   * in the user application.
   */
  protected async registerEdgePlugin() {
    let edge: Edge | null = null
    try {
      const edgeExports = await import('edge.js')
      edge = edgeExports.default
    } catch {}

    if (edge) {
      const { edgePluginSession } = await import('../src/plugins/edge.js')
      edge.use(edgePluginSession)
    }
  }

  /**
   * Registering muddleware
   */
  register() {
    this.app.container.singleton(SessionMiddleware, async (resolver) => {
      const sessionConfigProvider = this.app.config.get('session', {})

      /**
       * Resolve config from the provider
       */
      const config = await configProvider.resolve<any>(this.app, sessionConfigProvider)
      if (!config) {
        throw new RuntimeException(
          'Invalid "config/session.ts" file. Make sure you are using the "defineConfig" method'
        )
      }

      const emitter = await resolver.make('emitter')
      return new SessionMiddleware(config, emitter)
    })
  }

  /**
   * Adding edge tags (if edge is installed)
   */
  async boot() {
    await this.registerEdgePlugin()
  }
}
