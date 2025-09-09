/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Stats } from 'node:fs'
import { dirname, join } from 'node:path'
import string from '@adonisjs/core/helpers/string'
import { MessageBuilder } from '@adonisjs/core/helpers'
import { access, mkdir, readFile, rm, writeFile, utimes, stat } from 'node:fs/promises'

import debug from '../debug.ts'
import type { FileStoreConfig, SessionData, SessionStoreContract } from '../types.ts'

/**
 * File store writes the session data on the file system. Each session
 * id gets its own file for storage.
 *
 * @example
 * const fileStore = new FileStore({
 *   location: './tmp/sessions'
 * }, '2 hours')
 */
export class FileStore implements SessionStoreContract {
  /**
   * File store configuration
   */
  #config: FileStoreConfig

  /**
   * Session age/expiry time
   */
  #age: string | number

  /**
   * Creates a new file store instance
   *
   * @param config - File store configuration
   * @param age - Session age in seconds or time expression (e.g. '2 hours')
   */
  constructor(config: FileStoreConfig, age: string | number) {
    this.#config = config
    this.#age = age
    debug('initiating file store %O', this.#config)
  }

  /**
   * Returns an absolute path to the session id file
   *
   * @param sessionId - Session identifier
   */
  #getFilePath(sessionId: string): string {
    return join(this.#config.location, `${sessionId}.txt`)
  }

  /**
   * Checks if a file exists at a given path
   *
   * @param path - File path to check
   */
  async #pathExists(path: string) {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Returns file stats, ignoring missing files
   *
   * @param path - File path to get stats for
   */
  async #stats(path: string): Promise<Stats | null> {
    try {
      const stats = await stat(path)
      return stats
    } catch {
      return null
    }
  }

  /**
   * Outputs file with contents to the given path, creating directories if needed
   *
   * @param path - File path to write to
   * @param contents - File contents to write
   */
  async #outputFile(path: string, contents: string) {
    const pathDirname = dirname(path)

    const dirExists = await this.#pathExists(pathDirname)
    if (!dirExists) {
      await mkdir(pathDirname, { recursive: true })
    }

    await writeFile(path, contents, 'utf-8')
  }

  /**
   * Reads the session data from the disk
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = await store.read('sess_abc123')
   */
  async read(sessionId: string): Promise<SessionData | null> {
    const filePath = this.#getFilePath(sessionId)
    debug('file store: reading session data %', sessionId)

    /**
     * Return null when no session id file exists in first
     * place
     */
    const stats = await this.#stats(filePath)
    if (!stats) {
      return null
    }

    /**
     * Check if the file has been expired and return null (if expired)
     */
    const sessionWillExpireAt = stats.mtimeMs + string.seconds.parse(this.#age) * 1000
    if (Date.now() > sessionWillExpireAt) {
      debug('file store: expired session data %s', sessionId)
      return null
    }

    /**
     * Reading the file contents if the file exists
     */
    let contents = await readFile(filePath, 'utf-8')
    contents = contents.trim()
    if (!contents) {
      return null
    }

    /**
     * Verify contents with the session id and return them as an object. The verify
     * method can fail when the contents is not JSON>
     */
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Writes the session data to the disk as a string
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * await store.write('sess_abc123', { userId: 123 })
   */
  async write(sessionId: string, values: SessionData): Promise<void> {
    debug('file store: writing session data %s: %O', sessionId, values)

    const filePath = this.#getFilePath(sessionId)
    const message = new MessageBuilder().build(values, undefined, sessionId)

    await this.#outputFile(filePath, message)
  }

  /**
   * Removes the session file from the disk
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await store.destroy('sess_abc123')
   */
  async destroy(sessionId: string): Promise<void> {
    debug('file store: destroying session data %s', sessionId)
    await rm(this.#getFilePath(sessionId), { force: true })
  }

  /**
   * Updates the session expiry by updating the file's modification time
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await store.touch('sess_abc123')
   */
  async touch(sessionId: string): Promise<void> {
    debug('file store: touching session data %s', sessionId)
    await utimes(this.#getFilePath(sessionId), new Date(), new Date())
  }
}
