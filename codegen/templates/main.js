'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')
const debug = require('debug')('@skycatch/node-skyapi-sdk')

const print = {
  headers: (res) => ((
    keys = Array.from(res.headers.keys()),
    values = Array.from(res.headers.values())) =>
      keys.reduce((all, key, index) =>
        (all[key] = values[index], all), {})
  )(),
  request: ({requestId, method, url, headers, body}) => {
    if (!/@skycatch\//.test(process.env.DEBUG)) {
      return
    }
    if (process.env.NODE_ENV === 'test') {
      debug.extend('request')(method, url)
      debug.extend('request')(headers)
      debug.extend('request')(body ? JSON.parse(body) : undefined)
    }
    else {
      console.log(JSON.stringify({
        'skyapi-sdk-request': {
          requestId, method, url, headers, body: body ? JSON.parse(body) : undefined
        }
      }))
    }
  },
  response: ({requestId, res, body}) => {
    if (!/@skycatch\//.test(process.env.DEBUG)) {
      return
    }
    if (process.env.NODE_ENV === 'test') {
      debug.extend('response')(res.status, res.statusText)
      debug.extend('response')(print.headers(res))
      debug.extend('response')(body)
    }
    else {
      console.log(JSON.stringify({
        'skyapi-sdk-response': {
          requestId,
          status: `${res.status} ${res.statusText}`,
          headers: print.headers(res),
          body
        }
      }))
    }
  }
}

/*
  env      : dev, stage, prod
  origin   : http://localhost:3000
  domain   : staging-gemba.skycatch.com, staging-api.skycatch.com
  tenant   : skycatch-development.auth0.com, skycatch-staging.auth0.com
  key      : the app key
  secret   : the app secret
  audience : stage.datahub-api.skycatch.net/data_processing
  token    : access token to use instead of acquiring one using the key and the secret
  version  : the SkyAPI version to use - 2, 1
*/

module.exports = function SkyAPI ({env, origin, domain, tenant, key, secret, audience, token, version}) {
  const api = {}

  api.refresh = async () => {
    const method = 'POST'
    const url = (origin || `https://${tenant}`) + '/v1/oauth/token'
    const headers = {
      'Content-Type': 'application/json'
    }
    const body = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
      audience
    })

    print.request({url, method, headers, body})
    const res = await fetch(url, {method, headers, body})
    const json = await res.json()
    print.response({res, body: json})

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    }

    return json.access_token
  }

  api.request = async ({method, path, query, body, security, options = {}}) => {
    let headers = {}

    if (env) {
      headers['x-dh-env'] = env
    }

    if (security) {
      if (!token && key && secret) {
        token = await api.refresh()
      }

      if (token) {
        const {payload: {exp}} = jws.decode(token)
        if (Date.now() >= exp * 1000) {
          token = await api.refresh()
        }
        headers.authorization = `Bearer ${token}`
      }
    }

    if (Object.keys(query).length) {
      path += `?${qs.stringify(query, {arrayFormat: 'repeat'})}`
    }

    if (/put|post|patch|delete/i.test(method)) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(body)
    }
    else {
      body = undefined
    }

    const url = (origin || `https://${domain}`) + path
    const requestId = options.requestId
    delete options.requestId
    options = {...options, method, headers, body}

    print.request({requestId, url, method, headers, body})
    const res = await fetch(url, options)
    const json = await res.json()
    print.response({requestId, res, body: json})

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    }
    else {
     return json
    }
  }

  // v2 methods
  {{#methods}}
    {{>method}}
  {{/methods}}

  return api
}
