/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { RuntimeException } from '@poppinss/utils'
import type { AllowedSessionValues, SessionData } from './types.js'

/**
 * Readonly session store
 */
export class ReadOnlyValuesStore {
  /**
   * Underlying store values
   */
  protected values: SessionData

  /**
   * Find if store is empty or not
   */
  get isEmpty() {
    return !this.values || Object.keys(this.values).length === 0
  }

  constructor(values: SessionData | null) {
    this.values = values || {}
  }

  /**
   * Get value for a given key
   */
  get(key: string, defaultValue?: any): any {
    const value = lodash.get(this.values, key)
    if (defaultValue !== undefined && (value === null || value === undefined)) {
      return defaultValue
    }

    return value
  }

  /**
   * A boolean to know if value exists. Extra guards to check
   * arrays for it's length as well.
   */
  has(key: string, checkForArraysLength: boolean = true): boolean {
    const value = this.get(key)
    if (!Array.isArray(value)) {
      return !!value
    }

    return checkForArraysLength ? value.length > 0 : !!value
  }

  /**
   * Get all values
   */
  all(): any {
    return this.values
  }

  /**
   * Returns object representation of values
   */
  toObject() {
    return this.all()
  }

  /**
   * Returns the store values
   */
  toJSON(): any {
    return this.all()
  }

  /**
   * Returns string representation of the store
   */
  toString() {
    return JSON.stringify(this.all())
  }
}

/**
 * Session store encapsulates the session data and offers a
 * declarative API to mutate it.
 */
export class ValuesStore extends ReadOnlyValuesStore {
  /**
   * A boolean to know if store has been
   * modified
   */
  #modified: boolean = false

  constructor(values: SessionData | null) {
    super(values)
  }

  /**
   * Find if the store has been modified.
   */
  get hasBeenModified(): boolean {
    return this.#modified
  }

  /**
   * Set key/value pair
   */
  set(key: string, value: AllowedSessionValues): void {
    this.#modified = true
    lodash.set(this.values, key, value)
  }

  /**
   * Remove key
   */
  unset(key: string): void {
    this.#modified = true
    lodash.unset(this.values, key)
  }

  /**
   * Pull value from the store. It is same as calling
   * store.get and then store.unset
   */
  pull(key: string, defaultValue?: any): any {
    return ((value): any => {
      this.unset(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Increment number. The method raises an error when
   * nderlying value is not a number
   */
  increment(key: string, steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof value !== 'number') {
      throw new RuntimeException(`Cannot increment "${key}". Existing value is not a number`)
    }

    this.set(key, value + steps)
  }

  /**
   * Increment number. The method raises an error when
   * nderlying value is not a number
   */
  decrement(key: string, steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof value !== 'number') {
      throw new RuntimeException(`Cannot decrement "${key}". Existing value is not a number`)
    }

    this.set(key, value - steps)
  }

  /**
   * Overwrite existing store data with new values.
   */
  update(values: { [key: string]: any }): void {
    this.#modified = true
    this.values = values
  }

  /**
   * Update to merge values
   */
  merge(values: { [key: string]: any }): any {
    this.#modified = true
    lodash.merge(this.values, values)
  }

  /**
   * Reset store by clearing it's values.
   */
  clear(): void {
    this.update({})
  }
}
