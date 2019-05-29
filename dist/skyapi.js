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

    debug('skyapi:sdk:request')(url)
    debug('skyapi:sdk:request')(options)
    const res = await fetch(url, options)

    const json = await res.json()
    debug('skyapi:sdk:response:status')(res.status, res.statusText)
    debug('skyapi:sdk:response:headers')(res.headers)
    debug('skyapi:sdk:response:body')(json)

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    } else {
      return json
    }
  }

  return {
    refresh,
    request,

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

    /**
     * Creates a dataset
     * Creates a new dataset in the customer&#39;s account
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
     * @param (string) uuid - Dataset ID
     * @param (boolean) dryrun - Create processing job entry without starting the job
     * @param (string) type - Type of process to run
     * @param (object) ccrs - The definition of the custom coordinate reference system used to generate outputs and parse inputs
     * @param (object) options - Option flags to trigger custom behavior
     * @param (string) containerName - Name of the partner storage container to sync back
     * @param (string) prefix - Prefix for the partner storage container to sync back
     * @param (string) pointCloudColumnOrder - The column order of a point cloud. Only used for TXT point clouds
     * @param (string) connectionString - Container string required to identify the repository source. This is only needed for syncing
     * @param (string) resourceOwnerId - Description
     * @param (string) accessToken - Description
     * @param (string) refreshToken - Description
     * @param (string) syncType - Description
     */

    async createProcessingJob(params) {
      let method = 'post'.toUpperCase()
      let path = `/v${version || 2}` + '/datasets/{uuid}/processes'
      let query = {}
      let body = {}

      if (params['uuid'] !== undefined) {
        path = path.replace('{' + 'uuid' + '}', params['uuid'])
      }

      if (params['dryrun'] !== undefined) {
        body['dryrun'] = params['dryrun']
      }

      if (params['type'] !== undefined) {
        body['type'] = params['type']
      }

      if (params['ccrs'] !== undefined) {
        body['ccrs'] = params['ccrs']
      }

      if (params['options'] !== undefined) {
        body['options'] = params['options']
      }

      if (params['containerName'] !== undefined) {
        body['containerName'] = params['containerName']
      }

      if (params['prefix'] !== undefined) {
        body['prefix'] = params['prefix']
      }

      if (params['pointCloudColumnOrder'] !== undefined) {
        body['pointCloudColumnOrder'] = params['pointCloudColumnOrder']
      }

      if (params['connectionString'] !== undefined) {
        body['connectionString'] = params['connectionString']
      }

      if (params['resourceOwnerId'] !== undefined) {
        body['resourceOwnerId'] = params['resourceOwnerId']
      }

      if (params['accessToken'] !== undefined) {
        body['accessToken'] = params['accessToken']
      }

      if (params['refreshToken'] !== undefined) {
        body['refreshToken'] = params['refreshToken']
      }

      if (params['syncType'] !== undefined) {
        body['syncType'] = params['syncType']
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