/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/session.ts" />

import { Exception, lodash } from '@poppinss/utils'
import { cuid } from '@poppinss/utils/build/helpers'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import {
	SessionConfig,
	SessionContract,
	AllowedSessionValues,
	SessionDriverContract,
} from '@ioc:Adonis/Addons/Session'

import { Store } from '../Store'

/**
 * Session class exposes the API to read/write values to the session for
 * a given request.
 */
export class Session implements SessionContract {
	/**
	 * Set to true inside the `initiate` method
	 */
	public initiated = false

	/**
	 * A boolean to know if it's a fresh session or not. Fresh
	 * sessions are those, whose session id is not present
	 * in cookie
	 */
	public fresh = false

	/**
	 * A boolean to know if store is initiated in readonly mode
	 * or not. This is done during Websocket requests
	 */
	public readonly = false

	/**
	 * Session id for the given request. A new session id is only
	 * generated when the cookie for the session id is missing
	 */
	public sessionId = this.getSessionId()

	/**
	 * A copy of previously set flash messages
	 */
	public flashMessages = new Store({})

	/**
	 * A instance of store with values read from the driver. The store
	 * in initiated inside the [[initiate]] method
	 */
	private store: Store

	/**
	 * Whether or not to re-generate the session id before comitting
	 * session values.
	 */
	private regenerateSessionId = false

	/**
	 * A copy of flash messages. The `input` messages
	 * are overwritten when any of the input related
	 * methods are used.
	 *
	 * The `others` object is expanded with each call.
	 */
	public responseFlashMessages = new Store({})

	/**
	 * Session key for setting flash messages
	 */
	private flashMessagesKey = '__flash__'

	constructor(
		private ctx: HttpContextContract,
		private config: SessionConfig,
		private driver: SessionDriverContract
	) {}

	/**
	 * Returns a merged copy of flash messages or null
	 * when nothing is set
	 */
	private setFlashMessages(): void {
		if (this.responseFlashMessages.isEmpty) {
			return
		}

		const { input, ...others } = this.responseFlashMessages.all()
		this.put(this.flashMessagesKey, { ...input, ...others })
	}

	/**
	 * Returns the existing session id or creates one.
	 */
	private getSessionId(): string {
		const sessionId = this.ctx.request.cookie(this.config.cookieName)
		if (sessionId) {
			this.ctx.logger.trace('existing session found')
			return sessionId
		}

		this.fresh = true
		this.ctx.logger.trace('generating new session id')
		return cuid()
	}

	/**
	 * Ensures the session store is initialized
	 */
	private ensureIsReady(): void {
		if (!this.initiated) {
			throw new Exception(
				'Session store is not initiated yet. Make sure you are using the session hook',
				500,
				'E_RUNTIME_EXCEPTION'
			)
		}
	}

	/**
	 * Raises exception when session store is in readonly mode
	 */
	private ensureIsMutable() {
		if (this.readonly) {
			throw new Exception(
				'Session store is in readonly mode and cannot be mutated',
				500,
				'E_RUNTIME_EXCEPTION'
			)
		}
	}

	/**
	 * Touches the session cookie
	 */
	private touchSessionCookie(): void {
		this.ctx.logger.trace('touching session cookie')
		this.ctx.response.cookie(this.config.cookieName, this.sessionId, this.config.cookie!)
	}

	/**
	 * Commits the session value to the store
	 */
	private async commitValuesToStore(): Promise<void> {
		this.ctx.logger.trace('persist session store with driver')
		await this.driver.write(this.sessionId, this.store.toJSON())
	}

	/**
	 * Touches the driver to make sure the session values doesn't expire
	 */
	private async touchDriver(): Promise<void> {
		this.ctx.logger.trace('touch driver for liveliness')
		await this.driver.touch(this.sessionId)
	}

	/**
	 * Reading flash messages from the last HTTP request and
	 * updating the flash messages bag
	 */
	private readLastRequestFlashMessage() {
		if (this.readonly) {
			return
		}

		this.flashMessages.update(this.pull(this.flashMessagesKey, null))
	}

	/**
	 * Share flash messages & read only session's functions with views
	 * (only when view property exists)
	 */
	private shareLocalsWithView() {
		if (!this.ctx['view'] || typeof this.ctx['view'].share !== 'function') {
			return
		}

		this.ctx['view'].share({
			flashMessages: this.flashMessages,
			session: {
				get: this.get.bind(this),
				all: this.all.bind(this),
			},
		})
	}

	/**
	 * Initiating the session by reading it's value from the
	 * driver and feeding it to a store.
	 *
	 * Multiple calls to `initiate` results in a noop.
	 */
	public async initiate(readonly: boolean): Promise<void> {
		if (this.initiated) {
			return
		}

		this.readonly = readonly

		/**
		 * Profiling the driver read method
		 */
		await this.ctx.profiler.profileAsync(
			'session:initiate',
			{ driver: this.config.driver },
			async () => {
				const contents = await this.driver.read(this.sessionId)
				this.store = new Store(contents)
			}
		)

		this.initiated = true
		this.readLastRequestFlashMessage()
		this.shareLocalsWithView()
	}

	/**
	 * Re-generates the session id. This can is used to avoid
	 * session fixation attacks.
	 */
	public regenerate(): void {
		this.ctx.logger.trace('explicitly re-generating session id')
		this.regenerateSessionId = true
	}

	/**
	 * Set/update session value
	 */
	public put(key: string, value: AllowedSessionValues): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.store.set(key, value)
	}

	/**
	 * Get value from the session. The default value is returned
	 * when actual value is `undefined`
	 */
	public get(key: string, defaultValue?: any): any {
		this.ensureIsReady()
		return this.store.get(key, defaultValue)
	}

	/**
	 * Returns everything from the session
	 */
	public all(): any {
		this.ensureIsReady()
		return this.store.all()
	}

	/**
	 * Remove value for a given key from the session
	 */
	public forget(key: string): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.store.unset(key)
	}

	/**
	 * The method is equivalent to calling `session.get` followed
	 * by `session.forget`
	 */
	public pull(key: string, defaultValue?: any): any {
		this.ensureIsReady()
		this.ensureIsMutable()
		return this.store.pull(key, defaultValue)
	}

	/**
	 * Increment value for a number inside the session store. The
	 * method raises an error when underlying value is not
	 * a number
	 */
	public increment(key: string, steps: number = 1): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.store.increment(key, steps)
	}

	/**
	 * Decrement value for a number inside the session store. The
	 * method raises an error when underlying value is not
	 * a number
	 */
	public decrement(key: string, steps: number = 1): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.store.decrement(key, steps)
	}

	/**
	 * Remove everything from the session
	 */
	public clear(): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.store.clear()
	}

	/**
	 * Add a new flash message
	 */
	public flash(
		key: string | { [key: string]: AllowedSessionValues },
		value?: AllowedSessionValues
	): void {
		this.ensureIsReady()
		this.ensureIsMutable()

		/**
		 * Update value
		 */
		if (typeof key === 'string') {
			if (value) {
				this.responseFlashMessages.set(key, value)
			}
		} else {
			this.responseFlashMessages.merge(key)
		}
	}

	/**
	 * Flash all form values
	 */
	public flashAll(): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.responseFlashMessages.set('input', this.ctx.request.original())
	}

	/**
	 * Flash all form values except mentioned keys
	 */
	public flashExcept(keys: string[]): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.responseFlashMessages.set('input', lodash.omit(this.ctx.request.original(), keys))
	}

	/**
	 * Flash only defined keys from the form values
	 */
	public flashOnly(keys: string[]): void {
		this.ensureIsReady()
		this.ensureIsMutable()
		this.responseFlashMessages.set('input', lodash.pick(this.ctx.request.original(), keys))
	}

	/**
	 * Writes value to the underlying session driver.
	 */
	public async commit(): Promise<void> {
		await this.ctx.profiler.profileAsync(
			'session:commit',
			{ driver: this.config.driver },
			async () => {
				if (!this.initiated) {
					this.touchSessionCookie()
					await this.touchDriver()
					return
				}

				/**
				 * Cleanup old session and re-generate new session
				 */
				if (this.regenerateSessionId) {
					await this.driver.destroy(this.sessionId)
					this.sessionId = cuid()
				}

				/**
				 * Touch the session cookie to keep it alive.
				 */
				this.touchSessionCookie()
				this.setFlashMessages()
				await this.commitValuesToStore()
			}
		)
	}
}
