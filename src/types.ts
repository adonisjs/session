/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type HttpContext } from '@adonisjs/core/http'
import { type RedisConnections } from '@adonisjs/redis/types'
import type { CookieOptions } from '@adonisjs/core/types/http'
import type { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'

/**
 * Union type of all values that can be stored in session data.
 * These types are JSON serializable and safe for session storage.
 *
 * @example
 * // All valid session values
 * const stringVal: AllowedSessionValues = 'hello'
 * const numberVal: AllowedSessionValues = 42
 * const boolVal: AllowedSessionValues = true
 * const objectVal: AllowedSessionValues = { key: 'value' }
 * const dateVal: AllowedSessionValues = new Date()
 * const arrayVal: AllowedSessionValues = [1, 2, 3]
 */
export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>

/**
 * Shape of session data as a record of key-value pairs.
 * The session data must be JSON serializable for persistence.
 *
 * @example
 * const sessionData: SessionData = {
 *   userId: 123,
 *   username: 'john_doe',
 *   preferences: { theme: 'dark', language: 'en' },
 *   loginAt: new Date(),
 *   roles: ['user', 'editor']
 * }
 */
export type SessionData = Record<string, AllowedSessionValues>

/**
 * Contract interface that every session store implementation must follow.
 * Defines the basic CRUD operations for session data persistence.
 *
 * @example
 * class CustomStore implements SessionStoreContract {
 *   async read(sessionId: string) {
 *     // Read session data from your storage
 *     return await this.storage.get(sessionId)
 *   }
 *
 *   async write(sessionId: string, data: SessionData) {
 *     // Write session data to your storage
 *     await this.storage.set(sessionId, data)
 *   }
 *
 *   async destroy(sessionId: string) {
 *     // Remove session data from storage
 *     await this.storage.delete(sessionId)
 *   }
 *
 *   async touch(sessionId: string) {
 *     // Update expiry/last accessed time
 *     await this.storage.touch(sessionId)
 *   }
 * }
 */
export interface SessionStoreContract {
  /**
   * Reads session data for a given session ID from the persistence store
   *
   * @param sessionId - Unique identifier for the session
   */
  read(sessionId: string): Promise<SessionData | null> | SessionData | null

  /**
   * Writes session data for a given session ID to the persistence store
   *
   * @param sessionId - Unique identifier for the session
   * @param data - Session data to store
   */
  write(sessionId: string, data: SessionData): Promise<void> | void

  /**
   * Removes session data for a given session ID from the persistence store
   *
   * @param sessionId - Unique identifier for the session to remove
   */
  destroy(sessionId: string): Promise<void> | void

  /**
   * Updates the lifetime/expiry of a session without modifying the session data
   *
   * @param sessionId - Unique identifier for the session to touch
   */
  touch(sessionId: string): Promise<void> | void
}

/**
 * Extended session store contract that supports tagging sessions with user IDs.
 * This enables querying all sessions for a specific user, useful for features
 * like "logout from all devices" or "view active sessions".
 *
 * @example
 * class MyStore implements SessionStoreWithTaggingContract {
 *   // ... base SessionStoreContract methods ...
 *
 *   async tag(sessionId: string, userId: string) {
 *     await this.storage.tag(sessionId, userId)
 *   }
 *
 *   async tagged(userId: string) {
 *     return await this.storage.getSessionsByUser(userId)
 *   }
 * }
 */
export interface SessionStoreWithTaggingContract extends SessionStoreContract {
  /**
   * Associates a session with a user ID (tag).
   * This allows querying all sessions for a specific user.
   */
  tag(sessionId: string, userId: string | number): Promise<void> | void

  /**
   * Dissociate a session from the user ID (tag).
   */
  untag(sessionId: string, userId: string | number): Promise<void> | void

  /**
   * Returns all sessions associated with a given user ID (tag).
   * Only returns non-expired sessions.
   */
  tagged(userId: string | number): Promise<TaggedSession[]> | TaggedSession[]
}

/**
 * Base configuration interface for session management.
 * Used by the session manager and middleware to control session behavior.
 *
 * @example
 * const config: SessionConfig = {
 *   enabled: true,
 *   cookieName: 'my_app_session',
 *   age: '2 hours',
 *   cookie: {
 *     httpOnly: true,
 *     secure: true,
 *     sameSite: 'strict'
 *   }
 * }
 */
export interface SessionConfig {
  /**
   * Whether session management is enabled for the application
   */
  enabled: boolean

  /**
   * Name of the cookie used to store the session ID
   */
  cookieName: string

  /**
   * Maximum age of the session data and session ID cookie.
   * Session data is automatically cleaned up after this duration of inactivity.
   * Value can be a time expression (e.g. '2 hours') or number of seconds.
   * Cookie duration is also set to this value unless clearWithBrowser is enabled.
   */
  age: string | number

  /**
   * Additional cookie options for the session ID cookie.
   * Excludes maxAge and expires as they're controlled by age and clearWithBrowser.
   */
  cookie: Partial<CookieOptions>
}

/**
 * Configuration for file-based session storage.
 * Sessions are stored as individual files on the filesystem.
 *
 * @example
 * const fileConfig: FileStoreConfig = {
 *   location: './tmp/sessions'
 * }
 */
export type FileStoreConfig = {
  /**
   * Directory path where session files should be stored
   */
  location: string
}

/**
 * Configuration for Redis-based session storage.
 * Sessions are stored in a Redis database with automatic expiry.
 *
 * @example
 * const redisConfig: RedisStoreConfig = {
 *   connection: 'main' // Redis connection name from config/redis.ts
 * }
 */
export type RedisStoreConfig = {
  /**
   * Name of the Redis connection to use (must match connection name in config/redis.ts)
   */
  connection: keyof RedisConnections
}

/**
 * Configuration for AWS DynamoDB-based session storage.
 * Sessions are stored in a DynamoDB table with TTL support.
 * Supports either providing a DynamoDB client instance or client configuration.
 *
 * @example
 * // Using existing client
 * const configWithClient: DynamoDBStoreConfig = {
 *   client: dynamoClient,
 *   tableName: 'UserSessions',
 *   keyAttribute: 'sessionId'
 * }
 *
 * // Using client configuration
 * const configWithClientConfig: DynamoDBStoreConfig = {
 *   clientConfig: {
 *     region: 'us-east-1',
 *     credentials: { ... }
 *   },
 *   tableName: 'Sessions'
 * }
 */
export type DynamoDBStoreConfig = (
  | {
      /**
       * Pre-configured DynamoDB client instance
       */
      client: DynamoDBClient
    }
  | {
      /**
       * Configuration options for creating a new DynamoDB client
       */
      clientConfig: DynamoDBClientConfig
    }
) & {
  /**
   * DynamoDB table name for storing sessions (defaults to "Session")
   */
  tableName?: string
  /**
   * Attribute name for the session ID in the table (defaults to "key")
   */
  keyAttribute?: string
}

/**
 * Factory function type for creating session store instances.
 * Used by the session manager to instantiate stores per HTTP request.
 *
 * @param ctx - HTTP context for the current request
 * @param sessionConfig - Session configuration
 *
 * @example
 * const storeFactory: SessionStoreFactory = (ctx, sessionConfig) => {
 *   return new CustomStore({
 *     connection: ctx.database,
 *     maxAge: sessionConfig.age
 *   })
 * }
 */
export type SessionStoreFactory = (
  ctx: HttpContext,
  sessionConfig: SessionConfig
) => SessionStoreContract

/**
 * Represents a tagged session with its ID and data
 */
export interface TaggedSession {
  id: string
  data: SessionData
}

/**
 * Configuration used by the database store.
 */
export interface DatabaseStoreConfig {
  connectionName?: string
  tableName?: string

  /**
   * The probability (in percent) that garbage collection of expired
   * sessions will be triggered on any given request.
   *
   * For example, 2 means 2% chance.
   * Set to 0 to disable garbage collection.
   *
   * Defaults to 2 (2% chance)
   */
  gcProbability?: number
}

/**
 * Resolved session config after processing by defineConfig
 */
export interface ResolvedSessionConfig extends SessionConfig {
  store: string
  stores: Record<string, SessionStoreFactory>
}
