
async getProcessingJob ({puuid}) {
  let method = 'GET'
  let path = `/v1/processes/${puuid}`
  let query = {}
  let body = {}
  let security = true

  return request({method, path, query, body, security})
}
