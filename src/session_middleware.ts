/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { NextFn } from '@adonisjs/core/types/http'
import { type EmitterService } from '@adonisjs/core/types'
import { ExceptionHandler, Redirect, type HttpContext } from '@adonisjs/core/http'

import { Session } from './session.ts'
import type { SessionConfig, SessionStoreFactory } from './types.ts'

/**
 * HttpContext and Redirect augmentations
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    session: Session
  }

  export interface Redirect {
    withIntendedUrl(): Redirect
    toIntended(fallback?: string): void
  }
}

/**
 * Override getPreviousUrl to check the session for a stored
 * previous URL before falling back to the Referer header.
 */
const originalGetPreviousUrl = Redirect.prototype.getPreviousUrl
Redirect.macro('getPreviousUrl', function (this: Redirect, fallback: string) {
  if (this.ctx?.session) {
    const sessionUrl = this.ctx.session.pull('redirect.previousUrl')
    if (sessionUrl) {
      return sessionUrl
    }
  }
  return originalGetPreviousUrl.call(this, fallback)
})

/**
 * Store the current request URL as the intended destination,
 * then continue the redirect chain. Only stores for GET,
 * navigational, route-matched requests.
 */
Redirect.macro('withIntendedUrl', function (this: Redirect) {
  const ctx = this.ctx
  if (ctx?.session) {
    const isGet = ctx.request.method() === 'GET'
    const isNavigational = !ctx.request.ajax()
    const hasRoute = !!ctx.route

    if (isGet && isNavigational && hasRoute) {
      ctx.session.setIntendedUrl(ctx.request.url(true))
    }
  }

  return this
})

/**
 * Redirect to the intended URL stored in session. Consumes
 * the URL (read + delete). Falls back to the provided default.
 */
Redirect.macro('toIntended', function (this: Redirect, fallback: string = '/') {
  const intended = this.ctx?.session?.pullIntendedUrl() ?? fallback
  return this.toPath(intended)
})

/**
 * Overwriting validation exception renderer
 */
const originalErrorHandler = ExceptionHandler.prototype.renderValidationErrorAsHTML
ExceptionHandler.macro('renderValidationErrorAsHTML', async function (error, ctx) {
  if (ctx.session) {
    const withInput = ctx.request.header('X-Inertia') ? false : true
    ctx.session.flashValidationErrors(error, withInput)
    ctx.response.redirect('back', true)
  } else {
    return originalErrorHandler(error, ctx)
  }
})

/**
 * Session middleware is used to initiate the session store
 * and commit its values during an HTTP request.
 *
 * @example
 * // Register middleware in start/kernel.ts
 * server.use([
 *   () => import('#middleware/session_middleware')
 * ])
 *
 * // Access session in route handler
 * Route.get('/', ({ session }) => {
 *   session.put('visited', true)
 * })
 */
export default class SessionMiddleware<KnownStores extends Record<string, SessionStoreFactory>> {
  /**
   * Session configuration including store settings
   */
  #config: SessionConfig & {
    store: keyof KnownStores
    stores: KnownStores
  }

  /**
   * Event emitter service for session events
   */
  #emitter: EmitterService

  /**
   * Creates a new session middleware instance
   *
   * @param config - Session configuration with store settings
   * @param emitter - Event emitter service
   */
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

  /**
   * Handles the HTTP request by initializing session and committing changes
   *
   * @param ctx - HTTP context
   * @param next - Next middleware function
   */
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
