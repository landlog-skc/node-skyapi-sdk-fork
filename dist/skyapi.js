'use strict'

const fetch = require('@zeit/fetch-retry')(require('node-fetch'))
const qs = require('qs')
const jws = require('jws')

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

module.exports = function SkyAPI({
  origin,
  auth0,
  key,
  secret,
  audience,
  token,
  version
}) {

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

  const request = async ({
    method,
    path,
    query,
    body
  }) => {
    if (!token) {
      token = await refresh()
    }
    const {
      payload: {
        exp
      }
    } = jws.decode(token)
    if (Date.now() >= exp * 1000) {
      token = await refresh()
    }

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
      body: Object.keys(body).length ? body : undefined,
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
    /**
     * Creates a dataset
     * Long Description
     * @method
     * @name createDataset
     * @param (string) token - User access token
     * @param (string) userId - User identifier
     * @param (string) name - Dataset name
     */

    async createDataset(params) {
      let method = 'post'.toUpperCase()
      let path = `/v${version || 2}` + '/datasets'
      let query = {}
      let body = {}

      if (params['token'] !== undefined) {
        query['token'] = params['token']
      }

      if (params['userId'] !== undefined) {
        query['userId'] = params['userId']
      }

      if (params['name'] !== undefined) {
        body['name'] = params['name']
      }

      return request({
        method,
        path,
        query,
        body
      })
    },
    /**
     * Start processing a dataset
     * Initiates the processing of images or a point cloud in the dataset
     * @method
     * @name createProcessingJob
     * @param (string) id - Dataset ID
     */

    async createProcessingJob(params) {
      let method = 'post'.toUpperCase()
      let path = `/v${version || 2}` + '/datasets/{id}/processes'
      let query = {}
      let body = {}

      if (params['id'] !== undefined) {
        path = path.replace('{' + 'id' + '}', params['id'])
      }

      return request({
        method,
        path,
        query,
        body
      })
    },

    async getProcessingResults({
      puuid,
      layers
    }) {
      let method = 'GET'
      let path = `/v1/processes/${puuid}/result`
      let query = {}
      let body = {}

      if (layers) {
        query.layers = true
      }

      return request({
        method,
        path,
        query,
        body
      })
    },
  }
}