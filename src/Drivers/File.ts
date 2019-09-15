/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { join } from 'path'
import { Exception } from '@poppinss/utils'
import { readFile, ensureFile, outputFile, remove } from 'fs-extra'
import { SessionDriverContract, SessionConfigContract } from '@ioc:Adonis/Addons/Session'

/**
 * File driver to read/write session to filesystem
 */
export class FileDriver implements SessionDriverContract {
  constructor (private _config: SessionConfigContract) {
    if (!this._config.file || !this._config.file.location) {
      throw new Exception(
        'Missing file.location for session file driver inside config/session file',
        500,
        'E_INVALID_SESSION_DRIVER_CONFIG',
      )
    }
  }

  /**
   * Returns complete path to the session file
   */
  private _getFilePath (sessionId: string) {
    return join(this._config.file!.location, `${sessionId}.txt`)
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
   */
  public async read (sessionId: string): Promise<string> {
    await ensureFile(this._getFilePath(sessionId))
    const contents = await readFile(this._getFilePath(sessionId), 'utf-8')
    return contents.trim()
  }

  /**
   * Write session values to a file
   */
  public async write (sessionId: string, value: string): Promise<void> {
    await outputFile(this._getFilePath(sessionId), value)
  }

  /**
   * Cleanup session file by removing it
   */
  public async destroy (sessionId: string): Promise<void> {
    await remove(this._getFilePath(sessionId))
  }

  /**
   * Writes the value by reading it from the store
   */
  public async touch (sessionId: string) {
    const value = await this.read(sessionId)
    await this.write(sessionId, value)
  }
}
