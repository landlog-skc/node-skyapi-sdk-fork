'use strict'

/*
  THIS IS A MOCK
*/

const origin = 'https://s3-us-west-2.amazonaws.com'
const bucket = 'test.datahub-benchmark.1' // public bucket for the demo

/*
  This module is going to be implemented as lambda function responsible for
  listing processing job outputs in an S3 bucket.
*/

const NodeFetch = require('node-fetch')
const Fetch = require('@zeit/fetch-retry')(NodeFetch)

// types that can have other names
const internals = {}
internals.mapTypes = {
  '3dmesh': 'mesh',
  pointCloud: 'pointcloud',
  subsampled_pointCloud: 'subsampled_pointcloud',
  groundreturn_pointCloud: 'groundreturn_pointcloud',
  DSM: 'dsm',
  ortho: 'orthophoto'
}

module.exports = async (puuid) => {
  // The actual implementation is going to use aws-sdk instead
  const url = `${origin}/${bucket}/${puuid}/manifest.json`
  const res = await Fetch(url, {
    method: 'GET',
    mode: 'cors'
    // headers: { 'Authorization': `bearer ${authToken}` }
  })

  const manifest = await res.json()
  const headers = res.headers

  // console.log('Processing Job Request Response:', headers, manifest)

  // if 2xx response, return the org id
  const { ok } = res
  if (!ok) throw new Error(`Failed to retrieve processing job ${uuid} data`)

  const files = []
  const layers = []
  const results = manifest.forEach((f) => {
    let { filename, projection, resolution = 'full', type } = f
    if (type) {
      type = internals.mapTypes[type] || type
      if (type.indexOf('3dtiles') !== -1) {
        const typeToDir  = {
          '3dtiles_pointcloud': 'pointcloud'
        }

        layers.push({
          type,
          bucket,
          path: `${puuid}/3dtiles/${typeToDir[type]}/tileset.json`
        })
      } else {
        files.push({
          name: filename,
          ccrs: projection,
          type,
          resolution,
          url: '',
          bucket,
          path: `${puuid}/${filename}`
        })
      }
    }
  })

  return {
    results: {
      layers,
      files
    }
  }
}
