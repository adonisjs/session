'use strict'

/*
 * adonis-server
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const http = require('http')
const supertest = require('supertest')
const ObjectId = require('bson').ObjectId
const { Config } = require('@adonisjs/sink')
const helpers = require('./helpers')

const Session = require('../src/Session')
const Store = require('../src/Session/Store')
const { cookie: Cookie } = require('../src/Session/Drivers')

test.group('Session', () => {
  test('create session id', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate()
        .then(() => {
          assert.isTrue(session._isNewSessionId)
          res.end()
        })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.property(headers, 'set-cookie')
    assert.include(headers['set-cookie'][0], 'adonis-session=')
  })

  test('re-use existing session id if exists', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate()
        .then(() => {
          assert.isFalse(session._isNewSessionId)
          res.end()
        })
    })

    const { headers } = await supertest(server).get('/').set('Cookie', ['adonis-session=20']).expect(200)
    assert.property(headers, 'set-cookie')
    assert.equal(headers['set-cookie'][0].split(';')[0], 'adonis-session=20')
  })

  test('commit store changes with driver', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate()
        .then(() => {
          session.put('username', 'virk')
          return session.commit()
        })
        .then(() => {
          res.end()
        })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.deepEqual(helpers.getValueObject(headers['set-cookie'][1]), { username: { d: 'virk', t: 'String' } })
  })

  test('touch session when store is not dirty', async (assert) => {
    const existingTouch = Cookie.prototype.touch
    let calledTouch = false

    Cookie.prototype.touch = function () {
      calledTouch = true
    }

    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate()
        .then(() => {
          return session.commit()
        })
        .then(() => {
          res.end()
        })
    })

    await supertest(server).get('/').expect(200)
    assert.isTrue(calledTouch)
    Cookie.prototype.touch = existingTouch
  })

  test('throw exception when store is not initiated', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)

      try {
        session.put('username', 'virk')
      } catch (error) {
        res.writeHead(500)
        res.end(error.message)
      }
    })

    const { text } = await supertest(server).get('/').expect(500)
    assert.match(text, /E_RUNTIME_ERROR: Session store is not initiated yet. Make sure that you have included the session middleware inside the list of global middleware./)
  })

  test('initiate session in freezed state', async (assert) => {
    assert.plan(1)

    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate(true)
        .then(() => {
          assert.isTrue(session.freezed)
          res.end()
        }).catch(() => {
          res.writeHead(500)
          res.end()
        })
    })

    await supertest(server).get('/').expect(200)
  })

  test('do not set session id when initiated store in frozen state', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate(true)
        .then(() => {
          res.end()
        }).catch(() => {
          res.writeHead(500)
          res.end()
        })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.notProperty(headers, 'set-cookie')
  })

  test('throw exception when trying to modify freezed session', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate(true)
        .then(() => {
          session.put('username', 'virk')
        }).catch(({ message }) => {
          res.writeHead(500)
          res.end(message)
        })
    })

    const { headers, text } = await supertest(server).get('/').expect(500)
    assert.notProperty(headers, 'set-cookie')
    assert.match(text, /E_RUNTIME_ERROR: Session store is freezed and you cannot write values to session/)
  })

  test('should be able to access values in freezed state', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
        .instantiate(true)
        .then(() => {
          res.end(session.get('username'))
        }).catch(({ message }) => {
          res.writeHead(500)
          res.end(message)
        })
    })

    const { text } = await supertest(server).get('/').expect(200)
    assert.equal(text, '')
  })
})

test.group('Session Store', () => {
  test('initiate empty store', (assert) => {
    const store = new Store()
    assert.deepEqual(store._values, {})
  })

  test('throw exception when wrong values are passed to store', (assert) => {
    const store = () => new Store('hello')
    assert.throw(store, 'Cannot initiate session store since unable to parse')
  })

  test('initiate store with values', (assert) => {
    const values = { age: { d: 22, t: 'Number' } }
    const store = new Store(JSON.stringify(values))
    assert.deepEqual(store._values, { age: 22 })
  })

  test('guard number', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue(22), { d: '22', t: 'Number' })
  })

  test('guard object', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue({ age: 22 }), { d: JSON.stringify({ age: 22 }), t: 'Object' })
  })

  test('guard boolean', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue(true), { d: 'true', t: 'Boolean' })
  })

  test('guard date', (assert) => {
    const store = new Store()
    const date = new Date()
    assert.deepEqual(store._guardValue(date), { d: date.toString(), t: 'Date' })
  })

  test('guard array', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue([1, 2]), { d: JSON.stringify([1, 2]), t: 'Array' })
  })

  test('guard objectId', (assert) => {
    const store = new Store()
    const id = '507f191e810c19729de860ea'
    const objId = new ObjectId(id)
    assert.deepEqual(store._guardValue(objId), { d: id, t: 'ObjectID' })
  })

  test('unguard object', (assert) => {
    const store = new Store()
    const value = JSON.stringify({ username: 'virk' })
    assert.deepEqual(store._unGuardValue({ d: value, t: 'Object' }), { username: 'virk' })
  })

  test('unguard array', (assert) => {
    const store = new Store()
    const value = JSON.stringify([1, 2])
    assert.deepEqual(store._unGuardValue({ d: value, t: 'Array' }), [1, 2])
  })

  test('unguard boolean', (assert) => {
    const store = new Store()
    const value = String(true)
    assert.deepEqual(store._unGuardValue({ d: value, t: 'Boolean' }), true)
  })

  test('unguard date', (assert) => {
    const store = new Store()
    const date = new Date()
    const value = String(date)
    assert.deepEqual(store._unGuardValue({ d: value, t: 'Date' }).toString(), date.toString())
  })

  test('unguard objectId', (assert) => {
    const store = new Store()
    const id = '507f191e810c19729de860ea'
    const unguarded = store._unGuardValue({ d: id, t: 'ObjectID' })

    assert.equal(ObjectId.isValid(unguarded), true)
    assert.deepEqual(unguarded, new ObjectId(id))
  })

  test('throw exception when unguard wrong formatted value', (assert) => {
    const store = new Store()
    const fn = () => store._unGuardValue(2)
    assert.throw(fn, 'Cannot unguard unrecognized pair type')
  })

  test('throw error when trying to guard function', (assert) => {
    const store = new Store()
    const fn = () => store._guardValue(function () {})
    assert.throw(fn, 'Cannot store Function data type to session store')
  })

  test('add value to store', (assert) => {
    const store = new Store()
    store.put('age', 22)
    assert.deepEqual(store._values, { age: 22 })
  })

  test('add nested values to store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store._values, { user: { age: 22 } })
  })

  test('get value from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store.get('user.age'), 22)
  })

  test('get value from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store.get('user.age'), 22)
  })

  test('incr number value in store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.increment('user.age')
    assert.deepEqual(store.get('user.age'), 23)
  })

  test('incr number with more than 1', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.increment('user.age', 2)
    assert.deepEqual(store.get('user.age'), 24)
  })

  test('decrement number', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.decrement('user.age')
    assert.deepEqual(store.get('user.age'), 21)
  })

  test('throw exception when increment value is not a number', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    const fn = () => store.increment('username')
    assert.throw(fn, 'Cannot increment username with value as virk')
  })

  test('throw exception when decrement value is not a number', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    const fn = () => store.decrement('username')
    assert.throw(fn, 'Cannot decrement username with value as virk')
  })

  test('remove value from store', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.forget('username')
    assert.deepEqual(store._values, {})
  })

  test('remove nested values from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.forget('user.age')
    assert.deepEqual(store._values, { user: {} })
  })

  test('pull values from store', (assert) => {
    const store = new Store()
    store.put('user.profile.age', 22)
    const age = store.pull('user.profile')
    assert.deepEqual(age, { age: 22 })
    assert.deepEqual(store._values, { user: {} })
  })

  test('get cloned copy of store values', (assert) => {
    const store = new Store()
    store.put('user.profile.age', 22)
    const all = store.all()
    all.user.profile = { age: 24 }
    assert.deepEqual(all, { user: { profile: { age: 24 } } })
    assert.deepEqual(store._values, { user: { profile: { age: 22 } } })
  })

  test('pack values to json', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    assert.deepEqual(store.toJSON(), {
      username: { d: 'virk', t: 'String' },
      user: { d: JSON.stringify({ profile: { age: 22, name: 'virk' } }), t: 'Object' }
    })
  })

  test('unpack packed values', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    const store1 = new Store(JSON.stringify(store.toJSON()))
    assert.deepEqual(store1._values, store._values)
  })

  test('clear store', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    store.clear()
    assert.deepEqual(store._values, {})
  })

  test('set store as dirty when added new value', (assert) => {
    const store = new Store()
    assert.isFalse(store.isDirty)
    store.put('username', 'virk')
    assert.isTrue(store.isDirty)
  })

  test('do not set as dirty when getting value', (assert) => {
    const store = new Store()
    assert.isFalse(store.isDirty)
    store.get('username')
    assert.isFalse(store.isDirty)
  })

  test('set dirty when pulled value', (assert) => {
    const store = new Store(JSON.stringify({ username: { d: 'virk', t: 'String' } }))
    assert.isFalse(store.isDirty)
    assert.equal(store.pull('username'), 'virk')
    assert.isTrue(store.isDirty)
    assert.deepEqual(store._values, {})
  })

  test('initiate store with empty string', (assert) => {
    const store = new Store('')
    assert.deepEqual(store._values, {})
  })

  test('initiate store with null', (assert) => {
    const store = new Store(null)
    assert.deepEqual(store._values, {})
  })

  test('initiate store with undefined', (assert) => {
    const store = new Store(undefined)
    assert.deepEqual(store._values, {})
  })

  test('calling forget on non-existing value, should not make the store dirty', (assert) => {
    const store = new Store()
    store.forget('username')
    assert.isFalse(store.isDirty)
  })

  test('calling forget on existing value, should make the store dirty', (assert) => {
    const store = new Store(JSON.stringify({ username: { d: 'virk', t: 'String' } }))
    store.forget('username')
    assert.isTrue(store.isDirty)
    assert.deepEqual(store._values, {})
  })

  test('calling put for same value in the store should not make it dirty', (assert) => {
    const store = new Store(JSON.stringify({ username: { d: 'virk', t: 'String' } }))
    store.put('username', 'virk')
    assert.isFalse(store.isDirty)
  })
})
