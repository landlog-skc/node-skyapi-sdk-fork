
const puuid = '7c4a9bfe-5fea-4782-ab47-ee1e5d57391d'

const {getResults} = require('../')

;(async () => {
  
  const res = await getResults(puuid)
  console.log(JSON.stringify(res, null, 2))

})()
