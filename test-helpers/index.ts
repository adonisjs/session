/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Ioc } from '@adonisjs/fold'
import { IncomingMessage, ServerResponse } from 'http'
import { ServerConfig } from '@ioc:Adonis/Core/Server'
import { SessionConfig } from '@ioc:Adonis/Addons/Session'
import { Emitter } from '@adonisjs/events/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Encryption } from '@adonisjs/encryption/build/standalone'
import { HttpContext } from '@adonisjs/http-server/build/standalone'
import { RedisManager } from '@adonisjs/redis/build/src/RedisManager'

export const SECRET = Math.random().toFixed(36).substring(2, 38)
export const encryption = new Encryption({ secret: SECRET })
export const logger = new FakeLogger({ enabled: true, level: 'trace', name: 'adonis' })
export const profiler = new Profiler(__dirname, logger, {})

/**
 * Session default config
 */
export const sessionConfig: SessionConfig = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

/**
 * Default server config
 */
const defaultServerConfig = {
  subdomainOffset: 2,
  generateRequestId: false,
  allowMethodSpoofing: false,
  trustProxy: () => true,
  etag: false,
  jsonpCallbackName: 'callback',
  cookie: {},
}

/**
 * Returns HTTP context
 */
export function createCtx (
  req: IncomingMessage,
  res: ServerResponse,
  config: Partial<ServerConfig>,
): HttpContextContract {
  const profilerRow = profiler.create('http:request')
  const serverConfig = Object.assign(defaultServerConfig, config)
  return HttpContext
    .create('/', {}, logger, profilerRow, encryption, req, res, serverConfig) as unknown as HttpContextContract
}

/**
 * Sleep for a while
 */
export function sleep (time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * Signs value to be set as cookie header
 */
export function signCookie (value: any, name: string) {
  return `${name}=s:${encryption.verifier.sign(value, undefined, name)}`
}

/**
 * Encrypt value to be set as cookie header
 */
export function encryptCookie (value: any, name: string) {
  return `${name}=e:${encryption.encrypt(value, undefined, name)}`
}

/**
 * Decrypt cookie
 */
export function decryptCookie (header: any, name: string) {
  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.decrypt(cookieValue, name)
}

/**
 * Unsign cookie
 */
export function unsignCookie (header: any, name: string) {
  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.verifier.unsign<any>(cookieValue, name)
}

/**
 * Reference to the redis manager
 */
export function getRedisManager () {
  return new RedisManager(new Ioc(), {
    connections: {
      session: {},
    },
  } as any, new Emitter(new Ioc()))
}
