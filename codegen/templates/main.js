'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')
const pkg = require('../package.json')
const debug = require('debug')(pkg.name)

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

  const refresh = async () => {
    const res = await fetch((origin || `https://${tenant}`) + '/v1/oauth/token', {
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
    })

    const json = await res.json()
    return json.access_token
  }

  const request = async ({method, path, query, body}) => {
    if (!token && key && secret) {
      token = await refresh()
    }

    let headers = {}

    if (token) {
      const {payload: {exp}} = jws.decode(token)
      if (Date.now() >= exp * 1000) {
        token = await refresh()
      }
      headers.authorization = `Bearer ${token}`
    }

    if (Object.keys(query).length) {
      path += `?${qs.stringify(query)}`
    }

    if (/put|post|patch/i.test(method)) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(body)
    }
    else {
      body = undefined
    }

    const url = (origin || `https://${domain}`) + path
    const options = {method, headers, body}

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

  return {
    refresh,
    request,

    {{>getProcessingResults}},

    {{#methods}}
      {{>method}},
    {{/methods}}
  }
}
