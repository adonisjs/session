/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { CookieOptions } from '@adonisjs/core/types/http'
import type { SessionManager } from './session_manager.js'

/**
 * The callback to be passed to the `extend` method. It is invoked
 * for each request (if extended driver is in use).
 */
export type ExtendCallback = (
  manager: SessionManager,
  config: SessionConfig,
  ctx: HttpContext
) => SessionDriverContract

/**
 * The values allowed by the `session.put` method
 */
export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>
export type SessionData = Record<string, AllowedSessionValues>

/**
 * Session drivers must implement the session driver contract.
 */
export interface SessionDriverContract {
  /**
   * The read method is used to read the data from the persistence
   * store and return it back as an object
   */
  read(sessionId: string): Promise<SessionData | null> | SessionData | null

  /**
   * The write method is used to write the session data into the
   * persistence store.
   */
  write(sessionId: string, data: SessionData): Promise<void> | void

  /**
   * The destroy method is used to destroy the session by removing
   * its data from the persistence store
   */
  destroy(sessionId: string): Promise<void> | void

  /**
   * The touch method should update the lifetime of session id without
   * making changes to the session data.
   */
  touch(sessionId: string): Promise<void> | void
}

/**
 * Shape of session config.
 */
export interface SessionConfig {
  /**
   * Enable/disable sessions temporarily
   */
  enabled: boolean

  /**
   * The drivers to use
   */
  driver: string

  /**
   * The name of the cookie for storing the session id.
   */
  cookieName: string

  /**
   * When set to true, the session id cookie will be removed
   * when the user closes the browser.
   *
   * However, the persisted data will continue to exist until
   * it gets expired.
   */
  clearWithBrowser: boolean

  /**
   * How long the session data should be kept alive without any
   * activity.
   *
   * The session id cookie will also live for the same duration, unless
   * "clearWithBrowser" is enabled
   */
  age: string | number

  /**
   * Configuration used by the cookie driver and for storing the
   * session id cookie.
   */
  cookie: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>

  /**
   * Configuration used by the file driver.
   */
  file?: {
    location: string
  }

  /**
   * Reference to the redis connection name to use for
   * storing the session data.
   */
  redisConnection?: string
}
