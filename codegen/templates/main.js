'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')
const debug = require('debug')

/*
  Example values:
  origin:
    - https://staging-gemba.skycatch.com/v1
    - https://api.skycatch.com/v1
  audience:
    - datahub-api.skycatch.com/data_processing
    - https://api.skycatch.com/
  auth0:
    - https://skycatch-development.auth0.com/v1
    - https://skycatch-staging.auth0.com/v1
*/

module.exports = function SkyAPI ({origin, auth0, key, secret, audience, token, version}) {

  const refresh = async () => {
    const res = await fetch(`${auth0}/oauth/token`, {
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

    const url = origin + path
    const options = {method, headers, body}

    debug('skyapi:sdk:request')(url)
    debug('skyapi:sdk:request')(options)
    const res = await fetch(url, options)

    const json = await res.json()
    debug('skyapi:sdk:response:status')(res.status, res.statusText)
    debug('skyapi:sdk:response:headers')(res.headers)
    debug('skyapi:sdk:response:body')(json)

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
