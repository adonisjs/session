/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HttpContext } from '@adonisjs/core/http'
import { RedisConnections } from '@adonisjs/redis/types'
import type { CookieOptions } from '@adonisjs/core/types/http'

/**
 * The values allowed by the `session.put` method
 */
export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>
export type SessionData = Record<string, AllowedSessionValues>

/**
 * Session stores must implement the session store contract.
 */
export interface SessionStoreContract {
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
 * Base configuration for managing sessions without
 * stores.
 */
export interface SessionConfig {
  /**
   * Enable/disable sessions temporarily
   */
  enabled: boolean

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
   *
   * The value should be a time expression or a number in seconds
   */
  age: string | number

  /**
   * Configuration used by the cookie driver and for storing the
   * session id cookie.
   */
  cookie: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>
}

/**
 * Configuration used by the file store.
 */
export type FileStoreConfig = {
  location: string
}

/**
 * Configuration used by the redis store.
 */
export type RedisStoreConfig = {
  connection: keyof RedisConnections
}

/**
 * Factory function to instantiate session store
 */
export type SessionStoreFactory = (
  ctx: HttpContext,
  sessionConfig: SessionConfig
) => SessionStoreContract
