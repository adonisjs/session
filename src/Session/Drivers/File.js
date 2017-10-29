'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const fs = require('fs-extra')
const path = require('path')

/**
 * Redis driver to save session values to the
 * redis store.
 *
 * @class File
 * @constructor
 */
class File {
  /* istanbul ignore next */
  /**
   * Namespaces to inject
   *
   * @attribute inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Config', 'Adonis/Src/Helpers']
  }

  constructor (Config, Helpers) {
    const sessionLocation = Config.get('session.file.location', 'sessions')
    this._location = path.isAbsolute(sessionLocation) ? sessionLocation : Helpers.tmpPath(sessionLocation)
  }

  /**
   * Returns path to the session file
   *
   * @method _getFilePath
   *
   * @param  {String}     sessionId
   *
   * @return {String}
   *
   * @private
   */
  _getFilePath (sessionId) {
    return path.join(this._location, `${sessionId}.sess`)
  }

  /**
   * Read values from the session file
   *
   * @param  {String} sessionId
   *
   * @method read
   * @async
   *
   * @return {Object}
   */
  async read (sessionId) {
    try {
      return await fs.readFile(this._getFilePath(sessionId), 'utf-8')
    } catch (error) {
      /* istanbul ignore next */
      if (error.code !== 'ENOENT') {
        throw error
      }
      return ''
    }
  }

  /**
   * Write session values to file
   *
   * @method write
   * @async
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  async write (sessionId, values) {
    await fs.outputFile(this._getFilePath(sessionId), values)
  }

  /**
   * Update file last modified time
   *
   * @method touch
   * @async
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  async touch (sessionId, values) {
    const time = Math.floor(Date.now() / 1000)
    const exists = await fs.exists(this._getFilePath(sessionId))
    if (exists) {
      await fs.utimes(this._getFilePath(sessionId), time, time)
    } else {
      await this.write(sessionId, values)
    }
  }
}

module.exports = File
