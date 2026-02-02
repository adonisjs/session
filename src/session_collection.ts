/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import debug from './debug.ts'
import { E_SESSION_TAGGING_NOT_SUPPORTED } from './errors.ts'
import type {
  SessionData,
  TaggedSession,
  ResolvedSessionConfig,
  SessionStoreWithTaggingContract,
} from './types.ts'

/**
 * SessionCollection provides APIs for programmatic session
 * management. It allows reading, destroying, and tagging
 * sessions without an HTTP context.
 *
 * @example
 * ```ts
 * import app from '@adonisjs/core/services/app'
 * import { SessionCollection } from '@adonisjs/session'
 *
 * const sessionCollection = await app.container.make(SessionCollection)
 *
 * // List all sessions for a user
 * const sessions = await sessionCollection.tagged(String(user.id))
 *
 * // Destroy a specific session
 * await sessionCollection.destroy(sessionId)
 * ```
 */
export class SessionCollection {
  #store: SessionStoreWithTaggingContract

  /**
   * Creates a new SessionCollection instance
   *
   * @param config - Resolved session configuration
   */
  constructor(config: ResolvedSessionConfig) {
    const storeFactory = config.stores[config.store]
    this.#store = storeFactory(null as any, config) as SessionStoreWithTaggingContract
  }

  /**
   * Check if the current store supports tagging
   */
  supportsTagging(): boolean {
    return 'tag' in this.#store && 'tagged' in this.#store
  }

  /**
   * Returns the session data for the given session ID,
   * or null if the session does not exist
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = await sessionCollection.get('sess_abc123')
   */
  async get(sessionId: string): Promise<SessionData | null> {
    debug('session collection: getting session data %s', sessionId)
    return this.#store.read(sessionId)
  }

  /**
   * Destroys a session by its ID
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await sessionCollection.destroy('sess_abc123')
   */
  async destroy(sessionId: string): Promise<void> {
    debug('session collection: destroying session %s', sessionId)
    return this.#store.destroy(sessionId)
  }

  /**
   * Tag a session with a user ID.
   * Only supported by Memory, Redis and Database stores.
   *
   * @param sessionId - Session identifier
   * @param userId - User identifier to tag the session with
   *
   * @example
   * await sessionCollection.tag('sess_abc123', 'user_456')
   */
  async tag(sessionId: string, userId: string): Promise<void> {
    debug('session collection: tagging session %s with user %s', sessionId, userId)
    if (!this.supportsTagging()) throw new E_SESSION_TAGGING_NOT_SUPPORTED()

    return (this.#store as SessionStoreWithTaggingContract).tag(sessionId, userId)
  }

  /**
   * Get all sessions for a given user ID (tag).
   * Only supported by Memory, Redis and Database stores.
   *
   * @param userId - User identifier to get sessions for
   *
   * @example
   * const sessions = await sessionCollection.tagged('user_456')
   */
  async tagged(userId: string): Promise<TaggedSession[]> {
    debug('session collection: getting sessions tagged with user %s', userId)
    if (!this.supportsTagging()) throw new E_SESSION_TAGGING_NOT_SUPPORTED()

    return (this.#store as SessionStoreWithTaggingContract).tagged(userId)
  }
}
