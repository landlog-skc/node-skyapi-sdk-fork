'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')

module.exports = function SkyAPI ({origin, key, secret, tenant, audience, token}) {

  const refresh = async () => {
    const res = await fetch(`https://${tenant}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: key,
        client_secret: secret,
        audience: audience
      })
    })

    const json = await res.json()
    return json.access_token
  }

  const request = async ({method, path, query, body}) => {
    // const {payload: {exp}} = jws.decode(token)
    // if (Date.now() >= exp * 1000) {
    //   token = await refresh()
    // }

    const headers = {
      authorization: `Bearer ${token}`
    }

    if (Object.keys(query).length) {
      path += `?${qs.stringify(query)}`
    }

    if (Object.keys(body).length) {
      body = JSON.stringify(body)
      headers['content-type'] = 'application/json'
    }

    const url = origin + path
    const options = {
      method,
      headers,
      body,
    }

    const res = await fetch(url, options)

    if (/^(4|5)/.test(res.status)) {
      throw new Error(await res.text())
    }

    return res.json()
  }

  return {
    refresh,
    request,
    {{#methods}}
      {{>method}},
    {{/methods}}
  }
}
