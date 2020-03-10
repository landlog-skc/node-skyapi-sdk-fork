'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')

const debug = (() => {
  const pkg = require('../package.json')
  const debug = require('debug')(
    // there is no package when generating in tests
    process.env.NODE_ENV === 'test' ? '@skycatch/node-skyapi-sdk' : pkg.name
  )
  // multiline fix for CloudWatch
  // https://github.com/visionmedia/debug/issues/296#issuecomment-334283102
  debug.log = console.log.bind(console)

  // augment debug
  const wrap = debug => {
    // log
    const fn = (...args) => {
      // default behavior for local testing
      if (process.env.NODE_ENV === 'test') {
        debug(...args)
      }
      // for CloudWatch and Datadog
      // print as single line JSON prefixed with the current namespace
      else {
        args.forEach(arg => {
          console.log(JSON.stringify({ [fn.namespace]: arg }))
        })
      }
    }
    // copy methods
    Object.keys(debug).forEach(key => {
      fn[key] = debug[key]
    })
    // return new wrapped namespace
    fn.extend = namespace => wrap(debug.extend(namespace))
    return fn
  }

  return wrap(debug)
})()

/*
  origin   : http://localhost:3000
  domain   : staging-gemba.skycatch.com, staging-api.skycatch.com
  tenant   : skycatch-development.auth0.com, skycatch-staging.auth0.com
  key      : the app key
  secret   : the app secret
  audience : stage.datahub-api.skycatch.net/data_processing
  token    : access token to use instead of acquiring one using the key and the secret
  version  : the SkyAPI version to use - 2, 1
*/

module.exports = function SkyAPI ({origin, domain, tenant, key, secret, audience, token, version}) {
  const api = {}

  api.refresh = async () => {
    const url = (origin || `https://${tenant}`) + '/v1/oauth/token'
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: key,
        client_secret: secret,
        audience
      })
    }

    debug.extend('auth-request')(url)
    debug.extend('auth-request')(options)
    const res = await fetch(url, options)

    const json = await res.json()
    debug.extend('auth-response')(res.status, res.statusText)
    debug.extend('auth-response')(json)

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    }

    return json.access_token
  }

  api.request = async ({options, method, path, query, body, security}) => {
    let headers = {}

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

    if (/put|post|patch/i.test(method)) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(body)
    }
    else {
      body = undefined
    }

    const url = (origin || `https://${domain}`) + path
    options = { ...options, method, headers, body}

    debug.extend('request')(url)
    debug.extend('request')(options)
    const res = await fetch(url, options)

    const json = await res.json()
    debug.extend('response')(res.status, res.statusText)
    debug.extend('response')(res.headers)
    debug.extend('response')(json)

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
