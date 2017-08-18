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
const fs = require('fs-extra')
const { Config, Helpers } = require('@adonisjs/sink')
const helpers = require('./helpers')

const { file: FileDriver } = require('../src/Session/Drivers')

test.group('Driver - File', (group) => {
  group.afterEach(async () => {
    await fs.remove(path.join(__dirname, 'tmp'))
  })

  test('initiate file driver', (assert) => {
    const fileDriver = new FileDriver(new Config(), new Helpers(path.join(__dirname)))
    assert.instanceOf(fileDriver, FileDriver)
  })

  test('return empty string when session file doesn\'t exists', async (assert) => {
    const fileDriver = new FileDriver(new Config(), new Helpers(path.join(__dirname)))
    const values = await fileDriver.read(1)
    assert.equal(values, '')
  })

  test('write values to file', async (assert) => {
    const fileDriver = new FileDriver(new Config(), new Helpers(path.join(__dirname)))
    await fileDriver.write(1, JSON.stringify({ name: { d: 'virk', t: 'String' } }))
    const sessValues = await fs.readFile(path.join(__dirname, 'tmp/sessions/1.sess'), 'utf-8')
    assert.equal(sessValues, JSON.stringify({ name: { d: 'virk', t: 'String' } }))
  })

  if (process.platform !== 'win32') {
    test('update file ttl', async (assert) => {
      const fileDriver = new FileDriver(new Config(), new Helpers(path.join(__dirname)))
      await fileDriver.write(1, JSON.stringify({ name: { d: 'virk', t: 'String' } }))

      const time = new Date().getTime()
      await helpers.sleep(2000)
      const { mtime } = await fs.stat(path.join(__dirname, 'tmp/sessions/1.sess'))
      assert.isAbove((time), new Date(mtime).getTime())

      await fileDriver.touch(1)

      await helpers.sleep(2000)
      const { mtime: freshMTime } = await fs.stat(path.join(__dirname, 'tmp/sessions/1.sess'))
      assert.isBelow(time, new Date(freshMTime).getTime())
    }).timeout(0)
  }

  test('use custom file location', async (assert) => {
    const config = new Config()
    config.set('session.file.location', 'foo')
    const fileDriver = new FileDriver(config, new Helpers(path.join(__dirname)))
    assert.equal(fileDriver._location, path.join(__dirname, 'tmp/foo'))
  })

  test('do not make file path when it\'s absolute', async (assert) => {
    const config = new Config()
    config.set('session.file.location', path.join(__dirname, 'tmp/foo'))
    const fileDriver = new FileDriver(config, new Helpers(path.join(__dirname)))
    assert.equal(fileDriver._location, path.join(__dirname, 'tmp/foo'))
  })
})
