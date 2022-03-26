/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ServerContract } from '@ioc:Adonis/Core/Server'
import { SessionManagerContract } from '@ioc:Adonis/Addons/Session'
import { HttpContextConstructorContract } from '@ioc:Adonis/Core/HttpContext'

/**
 * Share "session" with the HTTP context. Define hooks to initiate and
 * commit session when sessions are enabled.
 */
export function defineServerBindings(
  HttpContext: HttpContextConstructorContract,
  Server: ServerContract,
  Session: SessionManagerContract
) {
  /**
   * Sharing session with the context
   */
  HttpContext.getter(
    'session',
    function session() {
      return Session.create(this)
    },
    true
  )

  /**
   * Do not register hooks when sessions are disabled
   */
  if (!Session.isEnabled()) {
    return
  }

  /**
   * Initiate session store
   */
  Server.hooks.before(async (ctx) => {
    await ctx.session.initiate(false)
  })

  /**
   * Commit store mutations
   */
  Server.hooks.after(async (ctx) => {
    await ctx.session.commit()
  })
}
