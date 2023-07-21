import type { CookieOptions } from '@adonisjs/core/types/http'
import type { SessionManager } from './session_manager.js'
import type { HttpContext } from '@adonisjs/core/http'

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
 * Shape of a driver that every session driver must have
 */
export interface SessionDriverContract {
  read(sessionId: string): Promise<Record<string, any> | null> | Record<string, any> | null
  write(sessionId: string, values: Record<string, any>): Promise<void> | void
  destroy(sessionId: string): Promise<void> | void
  touch(sessionId: string): Promise<void> | void
}

/**
 * Shape of session config.
 */
export interface SessionConfig {
  /**
   * Enable/disable session for the entire application lifecycle
   */
  enabled: boolean

  /**
   * The driver in play
   */
  driver: string

  /**
   * Cookie name.
   */
  cookieName: string

  /**
   * Clear session when browser closes
   */
  clearWithBrowser: boolean

  /**
   * Age of session cookie
   */
  age: string | number

  /**
   * Config for the cookie driver and also the session id
   * cookie
   */
  cookie: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>

  /**
   * Config for the file driver
   */
  file?: {
    location: string
  }

  /**
   * The redis connection to use from the `config/redis` file
   */
  redisConnection?: string
}

/**
 * The values allowed by the `session.put` method
 */
export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>
