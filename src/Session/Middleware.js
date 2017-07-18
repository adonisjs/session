'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const drivers = require('./Drivers')
const Session = require('./Session')
const { ioc } = require('@adonisjs/fold')

class SessionMiddleware {
  constructor (Config) {
    this.ConfigProvider = Config
    this._config = Config.merge('session', { driver: 'cookie' })
  }

  async handle (ctx, next) {
    const driverInstance = ioc.make(drivers[this._config.driver])
    driverInstance.setRequest(ctx.request, ctx.response)
    ctx.session = new Session(ctx.request, ctx.response, driverInstance, this.ConfigProvider)
    await ctx.session.initiate()
    await next()
    await ctx.session.commit()
  }
}

module.export = SessionMiddleware
