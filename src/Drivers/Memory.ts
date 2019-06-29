/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SessionDriverContract } from '@ioc:Adonis/Addons/Session'

/**
 * Memory driver is meant to be used for writing tests. Also tests
 * will have to find the lifecycle in session to clear old
 * sessions.
 */
export class MemoryDriver implements SessionDriverContract {
  public static sessions: Map<string, string> = new Map()

  /**
   * Read session id value from the memory
   */
  public async read (sessionId: string): Promise<string> {
    return MemoryDriver.sessions.get(sessionId) || ''
  }

  /**
   * Save in memory value for a given session id
   */
  public async write (sessionId: string, value: string): Promise<void> {
    MemoryDriver.sessions.set(sessionId, value)
  }

  /**
   * Cleanup for a single session
   */
  public async destroy (sessionId: string): Promise<void> {
    MemoryDriver.sessions.delete(sessionId)
  }
}
