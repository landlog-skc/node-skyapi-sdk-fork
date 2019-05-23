
const parser = require('swagger-parser')
const schema = require('openapi-schema-validation')


module.exports = async ({spec}) => {
  const doc = await parser.parse(spec)
  const definition = await parser.dereference(doc)

  // because $ref is not allowed inside
  // https://swagger.io/specification/#operationObject
  definition.paths =
    Object.keys(definition.paths).reduce((obj, path) =>
      (obj[path] = Object.keys(definition.paths[path]).reduce((obj, method) =>
        (obj[method] =
          definition.paths[path][method][method] ||
          definition.paths[path][method] // when called from lambda tests
        , obj), {}
      ), obj), {}
    )

  const {valid, errors} = schema.validate(doc, 3)
  if (!valid) {
    console.log(`
      Document is not valid OpenAPI, ${errors.length} validation errors
      ${JSON.stringify(errors, null, 2)}
    `)
  }

  return {
    json: definition,
    yaml: parser.YAML.stringify(definition),
  }
}
