/*
* @adonisjs/redis
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { ObjectId } from 'bson'
import { set, unset, get } from 'lodash'
import * as Typeof from 'type-of-is'
import { AllowedSessionValues } from '@ioc:Adonis/Addons/Session'

/**
 * Methods to convert different data types
 * to their string counter parts
 */
const toString = {
  'Number' (value: number): number {
    return value
  },
  'Boolean' (value: boolean): boolean {
    return value
  },
  'Object' (value: any): any {
    return value
  },
  'Array' (value: any): any {
    return value
  },
  'Date' (value: Date): string {
    return String(value)
  },
  'String' (value: string): string {
    return value
  },
  'ObjectID' (value: ObjectId): string {
    return String(value)
  },
  'ObjectId' (value: ObjectId): string {
    return String(value)
  },
}

/**
 * Methods to convert string value to their original
 * data types.
 */
const toOriginalType = {
  'Number' (value: number): number {
    return value
  },
  'Object' (value: string): any {
    return value
  },
  'Array' (value: string): any {
    return value
  },
  'Boolean' (value: boolean): boolean {
    return value
  },
  'Date' (value: string): Date {
    return new Date(value)
  },
  'String' (value: string): string {
    return value
  },
  'ObjectID' (value: string): ObjectId {
    return new ObjectId(value)
  },
  'ObjectId' (value: string): ObjectId {
    return new ObjectId(value)
  },
}

/**
 * Store is used to serialize and cast values from the session
 * storage.
 */
export class Store {
  private _values: any = {}

  constructor (value: string) {
    this._values = this._cast(value)
  }

  /**
   * Converts an existing stringified value to it's original
   * value.
   */
  private _castValue (value: any): any {
    if (value && value.d !== undefined && value.t) {
      return toOriginalType[value.t](value.d)
    }

    return null
  }

  /**
   * Cast serialized value string back to it's original shape.
   */
  private _cast (value: string): any {
    try {
      const parsed = JSON.parse(value)
      return Object.keys(parsed).reduce((result, key) => {
        result[key] = this._castValue(parsed[key])
        return result
      }, {})
    } catch (error) {
      return {}
    }
  }

  /**
   * Serializes a value to it's serialized form. The serialized
   * node contains enough information to convert the values
   * back to their original type.
   */
  private _serializeValue (value: any): any {
    const type = Typeof.string(value)
    if (!toString[type]) {
      throw new Error(`${type} data type cannot be saved into session`)
    }

    return {
      t: type,
      d: toString[type](value),
    }
  }

  /**
   * Serialize the store values
   */
  private _serialize (): any {
    return Object.keys(this._values).reduce((result, key) => {
      result[key] = this._serializeValue(this._values[key])
      return result
    }, {})
  }

  /**
   * Returns the JSON object version of serialized
   * values
   */
  public toJSON () {
    return this._serialize()
  }

  /**
   * Returns the stringified version of serialized
   * values
   */
  public toString () {
    return JSON.stringify(this.toJSON())
  }

  /**
   * Set key/value pair
   */
  public set (key: string, value: AllowedSessionValues) {
    set(this._values, key, value)
  }

  /**
   * Get all values
   */
  public all () {
    return this._values
  }

  /**
   * Get value for a given key
   */
  public get (key: string) {
    return get(this._values, key)
  }

  /**
   * Remove key
   */
  public unset (key: string) {
    unset(this._values, key)
  }

  /**
   * Reset store by clearing it's values.
   */
  public clear () {
    this._values = {}
  }
}
