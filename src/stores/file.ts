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
import string from '@poppinss/utils/string'
import { MessageBuilder } from '@adonisjs/core/helpers'
import { access, mkdir, readFile, rm, writeFile, utimes, stat } from 'node:fs/promises'

import debug from '../debug.js'
import type { FileStoreConfig, SessionData, SessionStoreContract } from '../types.js'

/**
 * File store writes the session data on the file system as. Each session
 * id gets its own file.
 *
 */
export class FileStore implements SessionStoreContract {
  #config: FileStoreConfig
  #age: string | number

  /**
   * @param {FileStoreConfig} config
   * @param {string|number}   The age must be in seconds or a time expression
   */
  constructor(config: FileStoreConfig, age: string | number) {
    this.#config = config
    this.#age = age
    debug('initiating file store %O', this.#config)
  }

  /**
   * Returns an absolute path to the session id file
   */
  #getFilePath(sessionId: string): string {
    return join(this.#config.location, `${sessionId}.txt`)
  }

  /**
   * Check if a file exists at a given path or not
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
   * Returns stats for a file and ignoring missing
   * files.
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
   * Output file with contents to the given path
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
   * Reads the session data from the disk.
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
   */
  async write(sessionId: string, values: SessionData): Promise<void> {
    debug('file store: writing session data %s: %O', sessionId, values)

    const filePath = this.#getFilePath(sessionId)
    const message = new MessageBuilder().build(values, undefined, sessionId)

    await this.#outputFile(filePath, message)
  }

  /**
   * Removes the session file from the disk
   */
  async destroy(sessionId: string): Promise<void> {
    debug('file store: destroying session data %s', sessionId)
    await rm(this.#getFilePath(sessionId), { force: true })
  }

  /**
   * Updates the session expiry by rewriting it to the
   * persistence store
   */
  async touch(sessionId: string): Promise<void> {
    debug('file store: touching session data %s', sessionId)
    await utimes(this.#getFilePath(sessionId), new Date(), new Date())
  }
}
