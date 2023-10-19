/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Emitter } from '@adonisjs/core/events'
import { AppFactory } from '@adonisjs/core/factories/app'
import type { ApplicationService, EventsList } from '@adonisjs/core/types'

import { defineConfig } from '../index.js'
import SessionMiddleware from '../src/session_middleware.js'
import type { SessionConfig, SessionStoreFactory } from '../src/types.js'

/**
 * Exposes the API to create an instance of the session middleware
 * without additional plumbing
 */
export class SessionMiddlewareFactory {
  #config: Partial<SessionConfig> & {
    store: string
    stores: Record<string, SessionStoreFactory>
  } = {
    store: 'memory',
    stores: {},
  }

  #emitter?: Emitter<EventsList>

  #getApp() {
    return new AppFactory().create(new URL('./', import.meta.url), () => {}) as ApplicationService
  }

  #getEmitter() {
    return this.#emitter || new Emitter<EventsList>(this.#getApp())
  }

  /**
   * Merge custom options
   */
  merge(options: {
    config?: Partial<SessionConfig> & {
      store: string
      stores: Record<string, SessionStoreFactory>
    }
    emitter?: Emitter<EventsList>
  }) {
    if (options.config) {
      this.#config = options.config
    }

    if (options.emitter) {
      this.#emitter = options.emitter
    }

    return this
  }

  /**
   * Creates an instance of the session middleware
   */
  async create() {
    const config = await defineConfig(this.#config).resolver(this.#getApp())
    return new SessionMiddleware(config, this.#getEmitter())
  }
}
