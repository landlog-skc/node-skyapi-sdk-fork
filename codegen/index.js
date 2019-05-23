
const transform = require('./transform')
const render = require('./render')
const openapi = require('../spec/openapi')


module.exports = async ({spec, json}) => {
  json = spec ? (await openapi({spec})).json : json

  // deep copy
  const definition = JSON.parse(JSON.stringify(json))

  // used for rendering
  definition.methods = transform(definition)

  // source code
  return render(definition)
}
