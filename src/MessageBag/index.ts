/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/session.ts" />

import { lodash } from '@poppinss/utils'
import { MessageBagContract } from '@ioc:Adonis/Addons/Session'

/**
 * Message bag to access flash messages
 */
export class MessageBag implements MessageBagContract {
	constructor(private messages: any) {}

	/**
	 * Find if store is empty or not
	 */
	public get isEmpty() {
		return !this.messages || Object.keys(this.messages).length === 0
	}

	/**
	 * Update the messages bad
	 */
	public update(messages: any): void {
		this.messages = messages
	}

	/**
	 * Returns all of the flash messages
	 */
	public all(): any {
		return this.messages
	}

	/**
	 * Returns the value from the flash messages store
	 */
	public get(key: string): any {
		return lodash.get(this.messages, key, null)
	}

	/**
	 * Update to set values
	 */
	public set(key: string, value: any): any {
		lodash.set(this.messages, key, value)
	}

	/**
	 * Update to merge values
	 */
	public merge(values: any): any {
		lodash.merge(this.messages, values)
	}

	/**
	 * A boolean to know if value exists. Extra guards to check
	 * arrays for it's length as well.
	 */
	public has(key: string, checkForArraysLength: boolean = true): boolean {
		const value = this.get(key)
		if (!Array.isArray(value)) {
			return !!value
		}

		return checkForArraysLength ? value.length > 0 : !!value
	}
}
