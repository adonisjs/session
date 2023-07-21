import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { SessionManager } from './session_manager.js'

export default class SessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const sessionManager = (await ctx.containerResolver.make('session')) as SessionManager
    if (!sessionManager.isEnabled()) {
      return
    }

    /**
     * Initiate session store
     */
    await ctx.session.initiate(false)

    /**
     * Call next middlewares or route handler
     */
    await next()

    /**
     * Commit store mutations
     */
    await ctx.session.commit()
  }
}
