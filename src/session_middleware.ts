import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { SessionManager } from './session_manager.js'

export default class SessionMiddleware {
  constructor(protected session: SessionManager) {}

  async handle(ctx: HttpContext, next: NextFn) {
    if (!this.session.isEnabled()) {
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
