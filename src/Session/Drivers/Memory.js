'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const memoryStore = new Map()

/**
 * Memory driver to save session values inside
 * memory.
 *
 * NOTE: Should be used in testing only
 *
 * @class Memory
 * @constructor
 */
class Memory {
  /**
   * Write session values to memory
   *
   * @method write
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  write (sessionId, values) {
    if (!values) {
      memoryStore.clear(sessionId)
      return
    }
    memoryStore.set(sessionId, values)
  }

  /**
   * Returns value for a given session id
   *
   * @method read
   *
   * @param  {String} sessionId
   *
   * @return {String}
   */
  read (sessionId) {
    return memoryStore.get(sessionId)
  }

  touch () {}
}

module.exports = exports = Memory
exports.memoryStore = memoryStore
