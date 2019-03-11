'use strict'

/*
  This API should be generated from Swagger definitions.
*/

const getResults = async (puuid) => {
  // should make request to the Sky API
  const api = require('./api/lambda-api-processing-result-get')
  return api(puuid)
}

module.exports = { getResults }
