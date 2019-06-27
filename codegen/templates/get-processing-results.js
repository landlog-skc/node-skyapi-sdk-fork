
async getProcessingResults ({puuid, layers}) {
  let method = 'GET'
  let path = `/v1/processes/${puuid}/result`
  let query = {}
  let body = {}
  let security = true

  if (layers) {
    query.layers = true
  }

  return request({method, path, query, body, security})
}
