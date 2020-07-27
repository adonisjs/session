/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/Session' {
	import { IocContract } from '@adonisjs/fold'
	import { CookieOptions } from '@ioc:Adonis/Core/Response'
	import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

	/**
	 * Shape of session config.
	 */
	export interface SessionConfig {
		driver: string

		/**
		 * Cookie name.
		 */
		cookieName: string

		/**
		 * Clear session when browser closes
		 */
		clearWithBrowser: boolean

		/**
		 * Age of session cookie
		 */
		age: string | number

		/**
		 * Config for the cookie driver and also the session id
		 * cookie
		 */
		cookie: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>

		/**
		 * Config for the file driver
		 */
		file?: {
			location: string
		}

		/**
		 * The redis connection to use from the `config/redis` file
		 */
		redisConnection?: string
	}

	/**
	 * Shape of a driver that every session driver must have
	 */
	export interface SessionDriverContract {
		read(sessionId: string): Promise<{ [key: string]: any } | null> | { [key: string]: any } | null
		write(sessionId: string, values: { [key: string]: any }): Promise<void> | void
		destroy(sessionId: string): Promise<void> | void
		touch(sessionId: string): Promise<void> | void
	}

	/**
	 * The callback to be passed to the `extend` method. It is invoked
	 * for each request (if extended driver is in use).
	 */
	export type ExtendCallback = (
		container: IocContract,
		config: SessionConfig,
		ctx: HttpContextContract
	) => SessionDriverContract

	/**
	 * The values allowed by the `session.put` method
	 */
	export type AllowedSessionValues = string | boolean | number | object | Date | Array<any>

	/**
	 * Shape of message bag, used for storing flash
	 * messages
	 */
	export interface MessageBagContract {
		all(): any
		get(key: string): any
		has(key: string, checkForArraysLength?: boolean): boolean
		update(messages: any): void
	}

	/**
	 * Shape of the actual session store
	 */
	export interface SessionContract {
		/**
		 * Has the store being initiated
		 */
		initiated: boolean

		/**
		 * Is session store readonly. Will be during Websockets
		 * request
		 */
		readonly: boolean

		/**
		 * Is session just created or we read received the
		 * session id from the request
		 */
		fresh: boolean

		/**
		 * Session id
		 */
		sessionId: string

		/**
		 * Previous request flash messages
		 */
		flashMessages: MessageBagContract

		/**
		 * Initiate session store
		 */
		initiate(readonly: boolean): Promise<void>

		/**
		 * Commit session mutations
		 */
		commit(): Promise<void>

		/**
		 * Re-generate session id. This help avoid session
		 * replay attacks.
		 */
		regenerate(): void

		/**
		 * Store API
		 */
		put(key: string, value: AllowedSessionValues): void
		get(key: string, defaultValue?: any): any
		all(): any
		forget(key: string): void
		pull(key: string, defaultValue?: any): any
		increment(key: string, steps?: number): any
		decrement(key: string, steps?: number): any
		clear(): void

		/**
		 * Flash messages API
		 */
		flash(values: { [key: string]: AllowedSessionValues }): void
		flash(key: string, value: AllowedSessionValues): void
		flashAll(): void
		flashOnly(keys: string[]): void
		flashExcept(keys: string[]): void
	}

	/**
	 * Session manager shape
	 */
	export interface SessionManagerContract {
		create(ctx: HttpContextContract): SessionContract
		extend(driver: string, callback: ExtendCallback): void
	}

	const Session: SessionManagerContract
	export default Session
}
