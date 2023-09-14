/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Edge } from 'edge.js'
import type { ApplicationService } from '@adonisjs/core/types'

import debug from '../src/debug.js'
import { registerSessionDriver } from '../src/helpers.js'
import SessionMiddleware from '../src/session_middleware.js'

/**
 * Session provider configures the session management inside an
 * AdonisJS application
 */
export default class SessionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Returns edge when it's installed
   */
  protected async getEdge(): Promise<Edge | null> {
    try {
      const { default: edge } = await import('edge.js')
      debug('Detected edge.js package. Adding session primitives to it')
      return edge
    } catch {
      return null
    }
  }

  /**
   * Registering muddleware
   */
  register() {
    this.app.container.singleton(SessionMiddleware, async (resolver) => {
      const config = this.app.config.get<any>('session', {})
      const emitter = await resolver.make('emitter')
      return new SessionMiddleware(config, emitter)
    })
  }

  /**
   * Registering the active driver when middleware is used
   * +
   * Adding edge tags (if edge is installed)
   */
  async boot() {
    this.app.container.resolving(SessionMiddleware, async () => {
      const config = this.app.config.get<any>('session')
      await registerSessionDriver(this.app, config.driver)
    })

    const edge = await this.getEdge()
    if (edge) {
      const { edgePluginSession } = await import('../src/plugins/edge.js')
      edge.use(edgePluginSession)
    }
  }
}
