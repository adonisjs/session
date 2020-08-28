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
	 * Store used for storing session values + flash messages
	 */
	export interface StoreContract {
		/**
		 * A boolean to know if store is empty
		 */
		isEmpty: boolean

		/**
		 * Set value for a key
		 */
		set(key: string, value: AllowedSessionValues): void

		/**
		 * Increment value for a key. An exception is raised when existing
		 * value is not a number
		 */
		increment(key: string, steps?: number): void

		/**
		 * Decrement value for a key. An exception is raised when existing
		 * value is not a number
		 */
		decrement(key: string, steps?: number): void

		/**
		 * Replace existing values with new ones
		 */
		update(values: { [key: string]: any }): void

		/**
		 * Merge values with existing ones
		 */
		merge(values: { [key: string]: any }): any

		/**
		 * Get all values
		 */
		all(): any

		/**
		 * Get value for a given key or use the default value
		 */
		get(key: string, defaultValue?: any): any

		/**
		 * Find if a value exists. Optionally you can also check arrays
		 * to have length too
		 */
		has(key: string, checkForArraysLength?: boolean): boolean

		/**
		 * Unset value
		 */
		unset(key: string): void

		/**
		 * Clear all values
		 */
		clear(): void

		/**
		 * Read value and then unset it at the same time
		 */
		pull(key: string, defaultValue?: any): any

		/**
		 * Convert store values toObject
		 */
		toObject(): any

		/**
		 * Convert store values to toJSON
		 */
		toJSON(): any
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
		flashMessages: StoreContract

		/**
		 * Flash messages that will be sent in the current
		 * request response
		 */
		responseFlashMessage: StoreContract

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
