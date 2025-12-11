/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionData, SessionStoreWithTaggingContract, TaggedSession } from '../types.js'

/**
 * Memory store is meant to be used for writing tests.
 */
export class MemoryStore implements SessionStoreWithTaggingContract {
  static sessions: Map<string, SessionData> = new Map()

  /**
   * Maps session IDs to user IDs (for tagging)
   */
  static tags: Map<string, string> = new Map()

  /**
   * Read session id value from the memory
   */
  read(sessionId: string): SessionData | null {
    return MemoryStore.sessions.get(sessionId) || null
  }

  /**
   * Save in memory value for a given session id
   */
  write(sessionId: string, values: SessionData): void {
    MemoryStore.sessions.set(sessionId, values)
  }

  /**
   * Cleanup for a single session
   */
  destroy(sessionId: string): void {
    MemoryStore.sessions.delete(sessionId)
    MemoryStore.tags.delete(sessionId)
  }

  touch(): void {}

  /**
   * Tag a session with a user ID
   */
  async tag(sessionId: string, userId: string): Promise<void> {
    MemoryStore.tags.set(sessionId, userId)
  }

  /**
   * Get all sessions for a given user ID (tag)
   */
  async tagged(userId: string): Promise<TaggedSession[]> {
    const sessions: TaggedSession[] = []

    for (const [sessionId, taggedUserId] of MemoryStore.tags) {
      const data = MemoryStore.sessions.get(sessionId)
      if (taggedUserId === userId && data) sessions.push({ id: sessionId, data })
    }

    return sessions
  }
}
