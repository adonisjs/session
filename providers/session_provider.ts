/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@adonisjs/core/exceptions'
import type { ApplicationService } from '@adonisjs/core/types'

import type { Session } from '../src/session.ts'
import SessionMiddleware from '../src/session_middleware.ts'
import { SessionCollection } from '../src/session_collection.ts'

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
    if (this.app.usingEdgeJS) {
      const edge = await import('edge.js')
      const { edgePluginSession } = await import('../src/plugins/edge.js')
      edge.default.use(edgePluginSession)
    }
  }

  /**
   * Resolves the session config from the config provider
   */
  async #resolveConfig() {
    const sessionConfigProvider = this.app.config.get('session', {})
    const config = await configProvider.resolve<any>(this.app, sessionConfigProvider)
    if (!config) {
      throw new RuntimeException(
        'Invalid "config/session.ts" file. Make sure you are using the "defineConfig" method'
      )
    }

    return config
  }

  /**
   * Registering bindings
   */
  register() {
    this.app.container.singleton(SessionMiddleware, async (resolver) => {
      const config = await this.#resolveConfig()
      const emitter = await resolver.make('emitter')
      return new SessionMiddleware(config, emitter)
    })

    this.app.container.singleton(SessionCollection, async () => {
      const config = await this.#resolveConfig()
      return new SessionCollection(config)
    })
  }

  /**
   * Adding edge tags (if edge is installed)
   */
  async boot() {
    await this.registerEdgePlugin()
  }
}
