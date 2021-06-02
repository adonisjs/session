/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { SessionConfig } from '@ioc:Adonis/Addons/Session'
import { Application } from '@adonisjs/core/build/standalone'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { RedisManager } from '@adonisjs/redis/build/src/RedisManager'

export const fs = new Filesystem(join(__dirname, 'app'))

/**
 * Session default config
 */
export const sessionConfig: SessionConfig = {
  enabled: true,
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

export async function setup(config?: any) {
  await fs.add('.env', '')
  await fs.add(
    'config/app.ts',
    `
		export const appKey = '${Math.random().toFixed(36).substring(2, 38)}',
		export const http = {
			cookie: {},
			trustProxy: () => true,
		}
	`
  )

  await fs.add(
    'config/session.ts',
    `
		const sessionConfig = ${JSON.stringify(config || sessionConfig, null, 2)}
		export default sessionConfig
	`
  )

  const app = new Application(fs.basePath, 'web', {
    providers: ['@adonisjs/core', '../../providers/SessionProvider'],
  })

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  return app
}

/**
 * Sleep for a while
 */
export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * Signs value to be set as cookie header
 */
export function signCookie(app: ApplicationContract, value: any, name: string) {
  const encryption = app.container.use('Adonis/Core/Encryption')
  return `${name}=s:${encryption.verifier.sign(value, undefined, name)}`
}

/**
 * Encrypt value to be set as cookie header
 */
export function encryptCookie(app: ApplicationContract, value: any, name: string) {
  const encryption = app.container.use('Adonis/Core/Encryption')
  return `${name}=e:${encryption.encrypt(value, undefined, name)}`
}

/**
 * Decrypt cookie
 */
export function decryptCookie(app: ApplicationContract, header: any, name: string) {
  const encryption = app.container.use('Adonis/Core/Encryption')
  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.decrypt(cookieValue, name)
}

/**
 * Unsign cookie
 */
export function unsignCookie(app: ApplicationContract, header: any, name: string) {
  const encryption = app.container.use('Adonis/Core/Encryption')

  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.verifier.unsign<any>(cookieValue, name)
}

/**
 * Reference to the redis manager
 */
export function getRedisManager(application: ApplicationContract) {
  return new RedisManager(
    application,
    {
      connection: 'session',
      connections: {
        session: {
          host: process.env.REDIS_HOST || '0.0.0.0',
          port: process.env.REDIS_PORT || 6379,
        },
      },
    } as any,
    application.container.use('Adonis/Core/Event')
  ) as unknown as RedisManagerContract
}
