'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config, Helpers } = require('@adonisjs/sink')

const manager = require('../src/Session/Manager')
const drivers = require('../src/Session/Drivers')

test.group('Session Manager', (group) => {
  group.before(() => {
    ioc.singleton('Adonis/Src/Config', () => {
      return new Config()
    })

    ioc.singleton('Adonis/Src/Helpers', () => {
      return new Helpers(path.join(__dirname))
    })

    ioc.singleton('Adonis/Addons/Redis', () => {
      return class Redis {
        static namedConnection () {}
      }
    })
  })

  test('add a new driver', (assert) => {
    class Mongo {}
    manager.extend('mongo', Mongo)
    assert.deepEqual(manager._drivers, { mongo: Mongo })
  })

  test('get cookie driver instance', (assert) => {
    assert.instanceOf(manager.makeDriverInstance('cookie'), drivers.cookie)
  })

  test('get redis driver instance', (assert) => {
    assert.instanceOf(manager.makeDriverInstance('redis'), drivers.redis)
  })

  test('get file driver instance', (assert) => {
    assert.instanceOf(manager.makeDriverInstance('file'), drivers.file)
  })

  test('get custom driver instance', (assert) => {
    assert.isDefined(manager.makeDriverInstance('mongo'))
  })

  test('throw exception when unable to find driver', (assert) => {
    const fn = () => manager.makeDriverInstance('foo')
    assert.throw(fn, 'E_INVALID_SESSION_DRIVER: foo is not a valid session provider')
  })
})
