/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/session.ts" />

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { SessionDriverContract, SessionConfig } from '@ioc:Adonis/Addons/Session'

/**
 * Cookie driver utilizes the encrypted HTTP cookies to write session value.
 */
export class CookieDriver implements SessionDriverContract {
	constructor(private config: SessionConfig, private ctx: HttpContextContract) {}

	/**
	 * Read session value from the cookie
	 */
	public read(sessionId: string): { [key: string]: any } | null {
		const cookieValue = this.ctx.request.encryptedCookie(sessionId)
		if (typeof cookieValue !== 'object') {
			return null
		}
		return cookieValue
	}

	/**
	 * Write session values to the cookie
	 */
	public write(sessionId: string, values: { [key: string]: any }): void {
		if (typeof values !== 'object') {
			throw new Error('Session cookie driver expects an object of values')
		}

		this.ctx.response.encryptedCookie(sessionId, values, this.config.cookie)
	}

	/**
	 * Removes the session cookie
	 */
	public destroy(sessionId: string): void {
		if (this.ctx.request.cookiesList()[sessionId]) {
			this.ctx.response.clearCookie(sessionId)
		}
	}

	/**
	 * Updates the cookie with existing cookie values
	 */
	public touch(sessionId: string): void {
		const value = this.read(sessionId)
		if (!value) {
			return
		}

		this.write(sessionId, value)
	}
}
