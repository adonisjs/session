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
const { memory: MemoryDriver } = require('../src/Session/Drivers')

test.group('Driver - Redis', () => {
  test('initiate redis driver', (assert) => {
    const memoryDriver = new MemoryDriver()
    assert.instanceOf(memoryDriver, MemoryDriver)
  })

  test('set session value', async (assert) => {
    const memoryDriver = new MemoryDriver()
    await memoryDriver.write(1, 'session-data')
    assert.equal(MemoryDriver.memoryStore.size, 1)
    assert.deepEqual(MemoryDriver.memoryStore.get(1), 'session-data')
  })

  test('read session value', async (assert) => {
    const memoryDriver = new MemoryDriver()
    MemoryDriver.memoryStore.set('2', 'session-data')
    assert.equal(memoryDriver.read('2'), 'session-data')
  })
})
