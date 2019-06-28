/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/Session' {
  import { CookieOptions } from '@poppinss/cookie'
  import { ObjectID } from 'bson'

  export interface SessionConfigContract {
    driver: Exclude<
    keyof SessionConfigContract,
      'driver' |
      'cookieName' |
      'clearWithBrowser' |
      'age'
    >,

    /**
     * Cookie name.
     */
    cookieName: string,

    /**
     * Clear session when browser closes
     */
    clearWithBrowser: boolean,

    /**
     * Age of session cookie
     */
    age: string | number,

    /**
     * Config for the cookie driver
     */
    cookie?: Partial<CookieOptions>,

    /**
     * Config for the file driver
     */
    file?: {
      location: string,
    },

    /**
     * Config for the redis driver
     */
    redis?: {
      host: string,
      port: number,
      password?: string,
      db?: string,
      keyPrefix?: string,
    } & { [key: string]: any },
  }

  export interface SessionDriverContract {
    read (sessionId: string): Promise<string>
    write (sessionId: string, value: string): Promise<void>
    destroy (sessionId: string): Promise<void>
  }

  export type AllowedSessionValues = string
    | boolean
    | number
    | object
    | Date
    | Array<any>
    | ObjectID
}
