/**
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SessionDriverContract, SessionConfigContract } from '@ioc:Adonis/Addons/Session'
import { join } from 'path'
import { readFile, ensureFile, outputFile, remove } from 'fs-extra'

/**
 * File driver to read/write session to filesystem
 */
export class FileDriver implements SessionDriverContract {
  constructor (private _config: SessionConfigContract) {}

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
  public async write (sessionId: string, value: any): Promise<void> {
    await outputFile(this._getFilePath(sessionId), value)
  }

  /**
   * Cleanup session file by removing it
   */
  public async destroy (sessionId: string): Promise<void> {
    await remove(this._getFilePath(sessionId))
  }
}
