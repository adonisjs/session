/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import test from 'japa'
import { MessageBag } from '../src/MessageBag'

test.group('Message Bag', () => {
  test('find if value exists in the bag', (assert) => {
    const bag = new MessageBag({})
    assert.isFalse(bag.has('username'))

    bag.update({ username: 'virk' })
    assert.isTrue(bag.has('username'))
  })

  test('check for arrays length', (assert) => {
    const bag = new MessageBag({})
    assert.isFalse(bag.has('users'))

    bag.update({ users: [] })
    assert.isFalse(bag.has('users'))

    bag.update({ users: ['virk'] })
    assert.isTrue(bag.has('users'))
  })

  test('do not check for array length when explicitly said no', (assert) => {
    const bag = new MessageBag({})
    assert.isFalse(bag.has('users'))

    bag.update({ users: [] })
    assert.isTrue(bag.has('users', false))

    bag.update({ users: ['virk'] })
    assert.isTrue(bag.has('users'))
  })
})
