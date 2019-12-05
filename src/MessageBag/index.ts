/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/session.ts" />

import { get } from 'lodash'
import { MessageBagContract } from '@ioc:Adonis/Addons/Session'

/**
 * Message bag to access flash messages
 */
export class MessageBag implements MessageBagContract {
  constructor (private messages: any) {
  }

  /**
   * Update the messages bad
   */
  public update (messages: any): void {
    this.messages = messages
  }

  /**
   * Returns all of the flash messages
   */
  public all (): any {
    return this.messages
  }

  /**
   * Returns the value from the flash messages store
   */
  public get (key: string): any {
    return get(this.messages, key, null)
  }

  /**
   * A boolean to know if value exists. Extra guards to check
   * arrays for it's length as well.
   */
  public has (key: string, checkForArraysLength: boolean = true): boolean {
    const value = this.get(key)
    if (!Array.isArray(value)) {
      return !!value
    }

    return checkForArraysLength ? value.length > 0 : !!value
  }
}
