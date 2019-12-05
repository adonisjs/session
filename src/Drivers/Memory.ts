/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { SessionDriverContract } from '@ioc:Adonis/Addons/Session'

/**
 * Memory driver is meant to be used for writing tests.
 */
export class MemoryDriver implements SessionDriverContract {
  public static sessions: Map<string, string> = new Map()

  /**
   * Read session id value from the memory
   */
  public read (sessionId: string): string {
    return MemoryDriver.sessions.get(sessionId) || ''
  }

  /**
   * Save in memory value for a given session id
   */
  public write (sessionId: string, value: string): void {
    MemoryDriver.sessions.set(sessionId, value)
  }

  /**
   * Cleanup for a single session
   */
  public destroy (sessionId: string): void {
    MemoryDriver.sessions.delete(sessionId)
  }

  public touch (): void {}
}
