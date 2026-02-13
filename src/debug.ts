/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger instance for AdonisJS session module.
 * Logs debug information when NODE_DEBUG environment variable includes 'adonisjs:session'.
 *
 * @example
 * // Enable debug logging by setting NODE_DEBUG environment variable
 * // NODE_DEBUG=adonisjs:session node app.js
 *
 * debug('session initiated')
 * debug('writing session data: %O', sessionData)
 */
export default debuglog('adonisjs:session')
