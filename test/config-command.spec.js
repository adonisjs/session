'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const ace = require('@adonisjs/ace')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { setupResolver, Helpers, Env } = require('@adonisjs/sink')
const ConfigSession = require('../commands/ConfigSession')

test.group('Make Config', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname))
    })

    ioc.bind('Env', () => {
      return new Env()
    })
    setupResolver()
  })

  group.after(async () => {
    try {
      await fs.remove(path.join(__dirname, 'config'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('create config file', async (assert) => {
    ace.addCommand(ConfigSession)
    const result = await ace.call('config:session')
    const exists = await fs.pathExists(result)
    const config = require(result)
    assert.deepEqual(config, {
      age: '2h',
      clearWithBrowser: true,
      cookie: {
        httpOnly: true,
        sameSite: true
      },
      cookieName: 'adonis-session',
      driver: 'cookie',
      file: {
        location: 'sessions'
      },
      redis: 'self::redis.default'
    })
    assert.isTrue(exists)
  })

  test('echo config file to console', async (assert) => {
    ace.addCommand(ConfigSession)
    const result = await ace.call('config:session', {}, { echo: true })
    assert.equal(result, 'echoed')
  })
})
