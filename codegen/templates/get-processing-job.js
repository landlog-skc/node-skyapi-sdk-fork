
async getProcessingJob ({puuid}) {
  let method = 'GET'
  let path = `/v1/processes/${puuid}`
  let query = {}
  let body = {}

  return request({method, path, query, body})
}
