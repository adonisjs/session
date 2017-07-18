'use strict'

const nodeCookie = require('node-cookie')
const querystring = require('querystring')

module.exports = {
  getResponse (res) {
    return {
      response: res,
      cookie: function (key, value, options) {
        nodeCookie.create(res, key, value, options)
      }
    }
  },

  getRequest (req) {
    return {
      request: req,
      cookie: function (key) {
        return nodeCookie.get(req, key)
      }
    }
  },

  getValueObject (cookie) {
    const value = cookie.replace('adonis-session-values=', '').split(';')[0]
    return JSON.parse(querystring.unescape(value).replace('j:', ''))
  },

  sleep (time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}
