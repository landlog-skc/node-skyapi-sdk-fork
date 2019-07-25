
api.getProcessingJob = async ({puuid}) => {
  let method = 'GET'
  let path = `/v1/processes/${puuid}`
  let query = {}
  let body = {}
  let security = true

  return api.request({method, path, query, body, security})
}
