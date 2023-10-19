/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EmitterService } from '@adonisjs/core/types'
import type { NextFn } from '@adonisjs/core/types/http'
import { ExceptionHandler, HttpContext } from '@adonisjs/core/http'

import { Session } from './session.js'
import type { SessionConfig, SessionStoreFactory } from './types.js'

/**
 * HttpContext augmentations
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    session: Session
  }
}

/**
 * Overwriting validation exception renderer
 */
const originalErrorHandler = ExceptionHandler.prototype.renderValidationErrorAsHTML
ExceptionHandler.macro('renderValidationErrorAsHTML', async function (error, ctx) {
  if (ctx.session) {
    ctx.session.flashValidationErrors(error)
    ctx.response.redirect('back', true)
  } else {
    return originalErrorHandler(error, ctx)
  }
})

/**
 * Session middleware is used to initiate the session store
 * and commit its values during an HTTP request
 */
export default class SessionMiddleware<KnownStores extends Record<string, SessionStoreFactory>> {
  #config: SessionConfig & {
    store: keyof KnownStores
    stores: KnownStores
  }
  #emitter: EmitterService

  constructor(
    config: SessionConfig & {
      store: keyof KnownStores
      stores: KnownStores
    },
    emitter: EmitterService
  ) {
    this.#config = config
    this.#emitter = emitter
  }

  async handle(ctx: HttpContext, next: NextFn) {
    if (!this.#config.enabled) {
      return next()
    }

    ctx.session = new Session(
      this.#config,
      this.#config.stores[this.#config.store], // reference to store factory
      this.#emitter,
      ctx
    )

    /**
     * Initiate session store
     */
    await ctx.session.initiate(false)

    /**
     * Call next middlewares or route handler
     */
    const response = await next()

    /**
     * Commit store mutations
     */
    await ctx.session.commit()

    /**
     * Return response
     */
    return response
  }
}
