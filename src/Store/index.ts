/*
* @adonisjs/redis
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { Exception, lodash } from '@poppinss/utils'
import { AllowedSessionValues } from '@ioc:Adonis/Addons/Session'

/**
 * Session store to access values.
 */
export class Store {
  private values: { [key: string]: any }

  constructor (values: { [key: string]: any } | null) {
    this.values = values || {}
  }

  /**
   * Returns the store values
   */
  public toJSON (): any {
    return this.values
  }

  /**
   * Set key/value pair
   */
  public set (key: string, value: AllowedSessionValues): void {
    lodash.set(this.values, key, value)
  }

  /**
   * Get all values
   */
  public all (): any {
    return this.values
  }

  /**
   * Get value for a given key
   */
  public get (key: string, defaultValue?: any): any {
    return lodash.get(this.values, key, defaultValue)
  }

  /**
   * Remove key
   */
  public unset (key: string): void {
    lodash.unset(this.values, key)
  }

  /**
   * Reset store by clearing it's values.
   */
  public clear (): void {
    this.values = {}
  }

  /**
   * Pull value from the store. It is same as calling
   * store.get and then store.unset
   */
  public pull (key: string, defaultValue?: any): any {
    return ((value): any => {
      this.unset(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Increment number. The method raises an error when
   * nderlying value is not a number
   */
  public increment (key: string, steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof (value) !== 'number') {
      throw new Exception(`Cannot increment "${key}", since original value is not a number`)
    }

    this.set(key, value + steps)
  }

  /**
   * Increment number. The method raises an error when
   * nderlying value is not a number
   */
  public decrement (key: string, steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof (value) !== 'number') {
      throw new Exception(`Cannot increment "${key}", since original value is not a number`)
    }

    this.set(key, value - steps)
  }
}
