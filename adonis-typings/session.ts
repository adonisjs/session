/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/Session' {
  import { ObjectID } from 'bson'
  import { IocContract } from '@adonisjs/fold'
  import { CookieOptions } from '@poppinss/cookie'
  import { HttpContextContract } from '@poppinss/http-server'

  /**
   * Session of session config. The end user must be able to
   * extend the interface and add their own config to it.
   */
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

  /**
   * Shape of a driver that every session driver must have
   */
  export interface SessionDriverContract {
    read (sessionId: string): Promise<string>
    write (sessionId: string, value: string): Promise<void>
    destroy (sessionId: string): Promise<void>
  }

  /**
   * The callback to be passed to the `extend` method. It is invoked
   * for each request (if extended driver is in use).
   */
  export type SessionDriverCallback = (
    container: IocContract,
    config: SessionConfigContract,
    ctx: HttpContextContract,
  ) => SessionDriverContract

  /**
   * The values allowed by the `session.put` method
   */
  export type AllowedSessionValues = string
    | boolean
    | number
    | object
    | Date
    | Array<any>
    | ObjectID

  /**
   * Shape of the actual session store
   */
  export interface SessionContract {
    initiated: boolean
    readonly: boolean
    fresh: boolean
    sessionId: string
    initiate (readonly: boolean): Promise<void>
    commit (): Promise<void>
    regenerate (): void

    /**
     * Store API
     */
    put (key: string, value: AllowedSessionValues): void
    get (key: string, defaultValue?: any): any
    all (): any
    forget (key: string): void
    pull (key: string, defaultValue?: any): any
    increment (key: string, steps?: number): any
    decrement (key: string, steps?: number): any
    clear (): void
  }

  /**
   * Session manager shape
   */
  export interface SessionManagerContract {
    create (ctx: HttpContextContract): SessionContract
    extend (driver: string, callback: CallableFunction): void
  }
}
