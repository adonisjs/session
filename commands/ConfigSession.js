'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const { Command } = require('@adonisjs/ace')

class ConfigSession extends Command {
  constructor (Helpers) {
    super()
    this.Helpers = Helpers
  }
  /**
   * The command signature
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    config:session
    { -e, --echo: Echo session file contents }
    `
  }

  /**
   * The command description
   *
   * @method description
   *
   * @return {String}
   */
  static get description () {
    return 'Save session config to the config file'
  }

  /**
   * IoC container injections
   *
   * @method inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Helpers']
  }

  /**
   * Handle method called by ace when command is executed
   *
   * @method handle
   *
   * @param  {Object} args
   * @param  {Boolean} options.echo
   *
   * @return {void}
   */
  async handle (args, { echo }) {
    const template = await this.readFile(path.join(__dirname, './templates/config.mustache'), 'utf-8')

    /**
     * Echo template over creating the config file
     */
    if (echo) {
      return this.viaAce ? console.log(template) : 'echoed'
    }

    /**
     * Create config file
     */
    const configPath = `${path.join(this.Helpers.configPath(), 'session.js')}`
    await this.generateFile(configPath, template, {})

    if (!this.viaAce) {
      return configPath
    }
    this.completed('created', configPath.replace(this.Helpers.appRoot(), '').replace(path.sep, ''))
  }
}

module.exports = ConfigSession
