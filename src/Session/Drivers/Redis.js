'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ms = require('ms')

/**
 * Redis driver to save session values to the
 * redis store.
 *
 * @class Redis
 * @constructor
 */
class Redis {
  /* istanbul ignore next */
  /**
   * Namespaces to inject
   *
   * @attribute inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Config', 'Adonis/Addons/RedisFactory']
  }

  constructor (Config, RedisFactory) {
    const config = Config.merge('session.redis', {
      port: 6379,
      host: '127.0.0.1'
    })

    const age = Config.get('session.age', '2 hrs')

    /**
     * Setting up ttl in seconds
     */
    this.ttl = (typeof (age) === 'number' ? age : ms(age)) / 1000 // in seconds

    /**
     * Setting cluster to false for sessions
     */
    this.redis = new RedisFactory(config, false)
  }

  /**
   * Read values from cookies
   *
   * @param  {String} sessionId
   *
   * @method read
   * @async
   *
   * @return {Object}
   */
  async read (sessionId) {
    return this.redis.get(sessionId)
  }

  /**
   * Write cookie values
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
    await this.redis.setex(sessionId, this.ttl, values)
  }

  /**
   * Touching the cookies by resetting it. There is no way
   * to just update the expires time on the cookie
   *
   * @method touch
   * @async
   *
   * @param  {String} sessionId
   * @param  {Object} values
   *
   * @return {void}
   */
  async touch (sessionId) {
    await this.redis.expire(sessionId, this.ttl)
  }
}

module.exports = Redis
