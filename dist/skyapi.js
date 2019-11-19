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
          console.log(JSON.stringify({
            [fn.namespace]: arg
          }))
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
   * Create STS credentials for use in S3 File Manager
   * Create STS credentials for use in S3 File Manager
   * @method
   * @name createFileManagerCredentials
   * @param (string) authorization - Organization's access token
   * @param (string) site - Site ID
   * @param (string) dataset - Dataset ID associated with this Site
   * @param (string) processing - Processing Job ID associated with this Dataset
   * @param () designfile - Create STS credentials for use in S3 File Manager
   */

  api.createFileManagerCredentials = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/credentials/filemanager'
    let query = {}
    let body = {}
    let security = true

    if (params['site'] !== undefined) {
      body['site'] = params['site']
    }

    if (params['dataset'] !== undefined) {
      body['dataset'] = params['dataset']
    }

    if (params['processing'] !== undefined) {
      body['processing'] = params['processing']
    }

    if (params['designfile'] !== undefined) {
      body['designfile'] = params['designfile']
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
   * Get a dataset
   * Get a dataset by id from the customer's account
   * @method
   * @name getDataset
   * @param (string) uuid - Dataset identifier
   * @param (boolean) exif - Fetch additional EXIF information for RAW photos in this dataset.
   */

  api.getDataset = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['exif'] !== undefined) {
      query['exif'] = params['exif']
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
   * Get Photo Metadata
   * Get Metadata for a RAW Drone Photo in a customer's account
   * @method
   * @name getDatasetPhoto
   * @param (string) authorization - M2M access token
   * @param (string) uuid - The dataset identifier
   * @param (string) id - The photo identifier
   */

  api.getDatasetPhoto = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/photos/{id}'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['id'] !== undefined) {
      path = path.replace('{' + 'id' + '}', params['id'])
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
   * Gets a list of jobs
   * Gets a list of jobs
   * @method
   * @name listProcessingJobs
   * @param (string) uuid - Dataset ID
   */

  api.listProcessingJobs = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/processes'
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
   * Start processing a dataset
   * Initiates the processing of images or a point cloud in the dataset
   * @method
   * @name createProcessingJob
   * @param (string) uuid - Dataset ID
   * @param (boolean) dryrun - Create processing job entry without starting the job
   * @param (string) type - Type of process to run
   * @param (string) sourceData - Type of input images
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

    if (params['sourceData'] !== undefined) {
      body['sourceData'] = params['sourceData']
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
   * List dataset validations
   * Get a list of known validations for a specific dataset
   * @method
   * @name getDatasetValidations
   * @param (string) uuid - Dataset ID
   * @param (string) type - Validation type
   * @param (string) authorization - Organization's access token
   */

  api.getDatasetValidations = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/validations'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['type'] !== undefined) {
      query['type'] = params['type']
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
   * Create validations for given dataset
   * Initiates the validation of images and/or ccrs in the dataset
   * @method
   * @name createDatasetValidations
   * @param (string) uuid - Dataset ID
   * @param (string) authorization - Organization's access token
   * @param (string) type - Type of validation to run
   * @param (object) data - Validation input such as images or ccrs
   */

  api.createDatasetValidations = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/validations'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['type'] !== undefined) {
      body['type'] = params['type']
    }

    if (params['data'] !== undefined) {
      body['data'] = params['data']
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
   * Delete datasets file
   * Backup file as .del and remove the original
   * @method
   * @name deleteDatasetFile
   * @param (string) uuid - Dataset ID
   * @param (string) id - File ID
   * @param (string) authorization - Organization's access token
   */

  api.deleteDatasetFile = async (params = {}) => {
    let method = 'delete'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/files/{id}'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['id'] !== undefined) {
      path = path.replace('{' + 'id' + '}', params['id'])
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
   * Delete datasets files
   * Find files of given type, back them up as .del and remove the original files
   * @method
   * @name deleteDatasetFiles
   * @param (string) uuid - Dataset ID
   * @param (string) type - File type
   * @param (string) authorization - Organization's access token
   */

  api.deleteDatasetFiles = async (params = {}) => {
    let method = 'delete'.toUpperCase()
    let path = `/v${version || 2}` + '/datasets/{uuid}/files'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['type'] !== undefined) {
      query['type'] = params['type']
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
   * Something
   * Something
   * @method
   * @name measureSurfaceElevation
   * @param (string) type - Measurement Type
   * @param (boolean) compact - True to compact the elevation deltas
   * @param (string) surfaceId - Processing Job UUID
   * @param (string) surfaceType - Surface type
   * @param (number) level - Zoom level
   * @param (object) feature - Something
   */

  api.measureSurfaceElevation = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/measure/{type}'
    let query = {}
    let body = {}
    let security = true

    if (params['type'] !== undefined) {
      path = path.replace('{' + 'type' + '}', params['type'])
    }

    if (params['compact'] !== undefined) {
      query['compact'] = params['compact']
    }

    if (params['surfaceId'] !== undefined) {
      body['surfaceId'] = params['surfaceId']
    }

    if (params['surfaceType'] !== undefined) {
      body['surfaceType'] = params['surfaceType']
    }

    if (params['level'] !== undefined) {
      body['level'] = params['level']
    }

    if (params['feature'] !== undefined) {
      body['feature'] = params['feature']
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
   * Retrieve the status and result of a measurement job
   * Retrieve the status and result of a measurement job
   * @method
   * @name getMeasurementResult
   * @param (string) type - Measurement Type
   * @param (string) id - Measurement ID
   */

  api.getMeasurementResult = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/measure/{type}/${id}'
    let query = {}
    let body = {}
    let security = true

    if (params['type'] !== undefined) {
      path = path.replace('{' + 'type' + '}', params['type'])
    }

    if (params['id'] !== undefined) {
      path = path.replace('{' + 'id' + '}', params['id'])
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
   * Measure Aggregate Volume
   * Measure Aggregate Volume
   * @method
   * @name measureAggregateVolume
   * @param (string) type - Measurement Type
   * @param (boolean) dryrun - Create measurement entry without starting the job
   * @param (boolean) refresh - Force re-calculation of a measurement
   * @param (string) surfaceId - Processing Job UUID
   * @param (string) surfaceType - Surface type
   * @param (array) surfaces - Measure Aggregate Volume
   * @param (number) level - Zoom level
   * @param (object) feature - Measure Aggregate Volume
   * @param (object) basePlane - Baseplane to compare the surface against for basic_volume measurements.
   * @param (number) changeThreshold - Changes below this threshold will be ignored when calculating progress measurements.
   */

  api.measureAggregateVolume = async (params = {}) => {
    let method = 'post'.toUpperCase()
    let path = `/v${version || 2}` + '/measure/aggregate/{type}'
    let query = {}
    let body = {}
    let security = true

    if (params['type'] !== undefined) {
      path = path.replace('{' + 'type' + '}', params['type'])
    }

    if (params['dryrun'] !== undefined) {
      query['dryrun'] = params['dryrun']
    }

    if (params['refresh'] !== undefined) {
      query['refresh'] = params['refresh']
    }

    if (params['surfaceId'] !== undefined) {
      body['surfaceId'] = params['surfaceId']
    }

    if (params['surfaceType'] !== undefined) {
      body['surfaceType'] = params['surfaceType']
    }

    if (params['surfaces'] !== undefined) {
      body['surfaces'] = params['surfaces']
    }

    if (params['level'] !== undefined) {
      body['level'] = params['level']
    }

    if (params['feature'] !== undefined) {
      body['feature'] = params['feature']
    }

    if (params['basePlane'] !== undefined) {
      body['basePlane'] = params['basePlane']
    }

    if (params['changeThreshold'] !== undefined) {
      body['changeThreshold'] = params['changeThreshold']
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
   * List Processing Job Results
   * List Processing Job Results
   * @method
   * @name getProcessingResults
   * @param (string) uuid - Processing Job ID
   * @param (boolean) layers - Toggle layers in response object
   * @param (array) exportTypes - Export Types
   */

  api.getProcessingResults = async (params = {}) => {
    let method = 'get'.toUpperCase()
    let path = `/v${version || 2}` + '/processes/{uuid}/result'
    let query = {}
    let body = {}
    let security = true

    if (params['uuid'] !== undefined) {
      path = path.replace('{' + 'uuid' + '}', params['uuid'])
    }

    if (params['layers'] !== undefined) {
      query['layers'] = params['layers']
    }

    if (params['exportTypes'] !== undefined) {
      query['exportTypes'] = params['exportTypes']
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