'use strict'

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

const getResults = async function (puuid) {
  const baseurl = 'https://s3-us-west-2.amazonaws.com/test.datahub-benchmark.1'
  const url = `${baseurl}/${puuid}/manifest.json`
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
          bucket: 'test.datahub-benchmark.1',
          path: `${puuid}/3dtiles/${typeToDir[type]}/tileset.json`
        })
      } else {
        files.push({
          name: filename,
          ccrs: projection,
          type,
          resolution,
          url: '',
          bucket: 'test.datahub-benchmark.1',
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

const promise = getResults('7c4a9bfe-5fea-4782-ab47-ee1e5d57391d')
promise.then((res) => {
  console.log(JSON.stringify(res, null, 2))
  process.exit(0)
})

module.exports = { getResults }
