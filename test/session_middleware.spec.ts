/*
 * @adonisjs/cors
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'node:http'

import SessionMiddleware from '../src/session_middleware.js'
import { createHttpContext, setup, unsignCookie } from '../test_helpers/index.js'

test.group('Session', () => {
  test('should initiate and commit the session', async ({ assert, fs }) => {
    assert.plan(3)

    const { app } = await setup(fs, {
      session: {
        enabled: true,
        cookieName: 'adonis-session',
        driver: 'file',
        file: { location: fs.basePath },
      },
    })

    const server = createServer(async (req, res) => {
      const session = await app.container.make('session')
      const middleware = new SessionMiddleware(session)
      const ctx = await createHttpContext(app, req, res)
      await middleware.handle(ctx, () => {
        assert.isTrue(ctx.session.initiated)
        ctx.session.put('username', 'jul')
      })
      ctx.response.finish()
    })

    const { header } = await supertest(server).get('/')
    const sessionId = await unsignCookie(app, header, 'adonis-session')

    await assert.fileExists(`${sessionId}.txt`)
    const content = await fs.contentsJson(`${sessionId}.txt`)
    assert.deepInclude(content, { message: { username: 'jul' } })
  })
})
