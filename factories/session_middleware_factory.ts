/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Emitter } from '@adonisjs/core/events'
import { ApplicationService, EventsList } from '@adonisjs/core/types'
import { AppFactory } from '@adonisjs/core/factories/app'

import { defineConfig } from '../index.js'
import { SessionConfig } from '../src/types/main.js'
import { registerSessionDriver } from '../src/helpers.js'
import SessionMiddleware from '../src/session_middleware.js'

/**
 * Exposes the API to create an instance of the session middleware
 * without additional plumbing
 */
export class SessionMiddlewareFactory {
  #config: Partial<SessionConfig> = { driver: 'memory' }
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
  merge(options: { config?: Partial<SessionConfig>; emitter?: Emitter<EventsList> }) {
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
    const config = defineConfig(this.#config)
    await registerSessionDriver(this.#getApp(), config.driver)
    return new SessionMiddleware(config, this.#getEmitter())
  }
}
