
api.getProcessingResults = async ({puuid, layers}) => {
  let method = 'GET'
  let path = `/v1/processes/${puuid}/result`
  let query = {}
  let body = {}
  let security = true

  if (layers) {
    query.layers = true
  }

  return api.request({method, path, query, body, security})
}
