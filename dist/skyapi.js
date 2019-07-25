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

module.exports = function SkyAPI({
  origin,
  domain,
  tenant,
  key,
  secret,
  audience,
  token,
  version
}) {
  const api = {}

  api.refresh = async () => {
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
    debug.extend('auth-refresh')(res.status, res.statusText)
    debug.extend('auth-refresh')(json)

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    }

    return json.access_token
  }

  api.request = async ({
    method,
    path,
    query,
    body,
    security
  }) => {
    let headers = {}

    if (security) {
      if (!token && key && secret) {
        token = await api.refresh()
      }

      if (token) {
        const {
          payload: {
            exp
          }
        } = jws.decode(token)
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
    } else {
      body = undefined
    }

    const url = (origin || `https://${domain}`) + path
    const options = {
      method,
      headers,
      body
    }

    debug.extend('request')(url)
    debug.extend('request')(options)
    const res = await fetch(url, options)

    const json = await res.json()
    debug.extend('response')(res.status, res.statusText)
    debug.extend('response')(res.headers)
    debug.extend('response')(json)

    if (/^(4|5)/.test(res.status)) {
      throw new Error(JSON.stringify(json))
    } else {
      return json
    }
  }

  // v1 temporary methods

  api.getProcessingResults = async ({
    puuid,
    layers
  }) => {
    let method = 'GET'
    let path = `/v1/processes/${puuid}/result`
    let query = {}
    let body = {}
    let security = true

    if (layers) {
      query.layers = true
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }

  api.getProcessingJob = async ({
    puuid
  }) => {
    let method = 'GET'
    let path = `/v1/processes/${puuid}`
    let query = {}
    let body = {}
    let security = true

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }

  // v2 methods
  /**
   * Creates a transform matrix for CCRS localization
   * Parses a localization file to create a new transform matrix to be used in a compound coordinate reference system (CCRS)
   * @method
   * @name createCCRSLocalization
   * @param (number) version - The version of the localization library to use when calculating the transform matrix
   * @param (string) file - Localization data as base64 encoded binary
   * @param (string) units - Parses a localization file to create a new transform matrix to be used in a compound coordinate reference system (CCRS)
   */

  api.createCCRSLocalization = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/ccrs/localization'
    let query = {}
    let body = {}
    let security = false

    if (params['version'] !== undefined) {
      query['version'] = params['version']
    }

    if (params['file'] !== undefined) {
      body['file'] = params['file']
    }

    if (params['units'] !== undefined) {
      body['units'] = params['units']
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
  /**
   * Creates a dataset
   * Creates a new dataset in the customer's account
   * @method
   * @name createDataset
   * @param (string) authorization - Organization's access token
   * @param (string) token - User access token
   * @param (string) userId - User identifier
   * @param (string) name - Dataset name
   * @param (string) sourceId -  The source ID in the app creating the dataset. If passed in it will be used as the name for the s3 object dir in place of the DUUID. 
   * @param (string) type - The dataset type
   * @param (object) metadata - Metadata about the dataset
   */

  api.createDataset = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets'
    let query = {}
    let body = {}
    let security = true

    if (params['token'] !== undefined) {
      query['token'] = params['token']
    }

    if (params['userId'] !== undefined) {
      query['userId'] = params['userId']
    }

    if (params['name'] !== undefined) {
      body['name'] = params['name']
    }

    if (params['sourceId'] !== undefined) {
      body['sourceId'] = params['sourceId']
    }

    if (params['type'] !== undefined) {
      body['type'] = params['type']
    }

    if (params['metadata'] !== undefined) {
      body['metadata'] = params['metadata']
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
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

  api.createProcessingJob = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/processes'
    let query = {}
    let body = {}
    let security = true

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

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
  /**
   * Gets design files
   * Retrieves processed design files for a dataset
   * @method
   * @name getDesignFiles
   * @param (string) uuid - Designfile identifier
   */

  api.getDesignFiles = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/designfiles/{uuid}'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
  /**
   * Get a list of known geoids for a specific location (lat/lon)
   * Get a list of known geoids for a specific location (lat/lon)
   * @method
   * @name getGeoids
   * @param (number) lon - Longitude
   * @param (number) lat - Latitude
   */

  api.getGeoids = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/geoids'
    let query = {}
    let body = {}
    let security = false

    if (params['lon'] !== undefined) {
      query['lon'] = params['lon']
    }

    if (params['lat'] !== undefined) {
      query['lat'] = params['lat']
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
  /**
   * Something
   * Something
   * @method
   * @name getGeoidsHeight
   * @param (string) id - Geoid
   * @param (number) lat - Latitude
   * @param (number) lon - Longtitude
   */

  api.getGeoidsHeight = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/geoids/{id}/height'
    let query = {}
    let body = {}
    let security = false

    if (params['id'] !== undefined) {
      path = path.replace('{' + 'id' + '}', params['id'])
    }

    if (params['lat'] !== undefined) {
      query['lat'] = params['lat']
    }

    if (params['lon'] !== undefined) {
      query['lon'] = params['lon']
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }
  /**
   * Get a list of known projections for a specific location (lat/lon)
   * Get a list of known projections for a specific location (lat/lon)
   * @method
   * @name getProjections
   * @param (number) lon - Longitude
   * @param (number) lat - Latitude
   */

  api.getProjections = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/projections'
    let query = {}
    let body = {}
    let security = false

    if (params['lon'] !== undefined) {
      query['lon'] = params['lon']
    }

    if (params['lat'] !== undefined) {
      query['lat'] = params['lat']
    }

    return api.request({
      method,
      path,
      query,
      body,
      security
    })
  }

  return api
}