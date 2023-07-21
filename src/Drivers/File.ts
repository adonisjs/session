/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { Exception } from '@poppinss/utils'
import { MessageBuilder } from '@poppinss/utils'
import { ensureFile, outputFile, remove } from 'fs-extra/esm'
import { readFile } from 'node:fs/promises'
import { SessionConfig, SessionDriverContract } from '../types.js'

/**
 * File driver to read/write session to filesystem
 */
export class FileDriver implements SessionDriverContract {
  #config: SessionConfig

  constructor(config: SessionConfig) {
    this.#config = config

    if (!this.#config.file || !this.#config.file.location) {
      throw new Exception(
        'Missing "file.location" for session file driver inside "config/session" file',
        { code: 'E_INVALID_SESSION_DRIVER_CONFIG', status: 500 }
      )
    }
  }

  /**
   * Returns complete path to the session file
   */
  #getFilePath(sessionId: string): string {
    return join(this.#config.file!.location, `${sessionId}.txt`)
  }

  /**
   * Returns file contents. A new file will be created if it's
   * missing.
   */
  public async read(sessionId: string): Promise<{ [key: string]: any } | null> {
    const filePath = this.#getFilePath(sessionId)
    await ensureFile(filePath)

    const contents = await readFile(filePath, 'utf-8')
    if (!contents.trim()) {
      return null
    }

    /**
     * Verify contents with the session id and return them as an object.
     */
    const verifiedContents = new MessageBuilder().verify(contents.trim(), sessionId)
    if (typeof verifiedContents !== 'object') {
      return null
    }

    return verifiedContents
  }

  /**
   * Write session values to a file
   */
  public async write(sessionId: string, values: { [key: string]: any }): Promise<void> {
    if (typeof values !== 'object') {
      throw new Error('Session file driver expects an object of values')
    }

    const message = new MessageBuilder().build(values, undefined, sessionId)
    await outputFile(this.#getFilePath(sessionId), message)
  }

  /**
   * Cleanup session file by removing it
   */
  public async destroy(sessionId: string): Promise<void> {
    await remove(this.#getFilePath(sessionId))
  }

  /**
   * Writes the value by reading it from the store
   */
  public async touch(sessionId: string): Promise<void> {
    const value = await this.read(sessionId)
    if (!value) {
      return
    }

    await this.write(sessionId, value)
  }
}
