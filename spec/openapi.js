
const fs = require('fs')
const path = require('path')
const parser = require('swagger-parser')
const schema = require('openapi-schema-validation')


module.exports = async ({spec}) => {

  const definition = await parser.dereference(spec, {
    // when not in tests @skycatch/skyapi-common-spec gets installed
    // in the root node_modules folder by NPM
    resolve: {
      file: {
        order: 1,
        read: (file, next) => {
          let fpath = file.url

          if (process.env.NODE_ENV !== 'test') {
            var index = fpath.indexOf('@skycatch/skyapi-common-spec')
            if (index !== -1) {
              fpath = path.resolve(__dirname, '../node_modules', fpath.slice(index))
            }
          }

          fs.readFile(fpath, 'utf8', next)
        }
      }
    }
  })

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

  const {valid, errors} = schema.validate(definition, 3)
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
