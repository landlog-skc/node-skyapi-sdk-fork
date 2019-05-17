
module.exports = (definition) =>
  Object.keys(definition.paths).map((path) =>
    Object.keys(definition.paths[path]).map((method) => {
      let {parameters = [], requestBody} = definition.paths[path][method]
      let form = []
      if (requestBody) {
        let {properties = {}, required = []} = requestBody.content['application/json'].schema
        form = Object.keys(properties).map((name) => {
          let config = properties[name]
          return {...config, name, required: required.includes(name), body: true}
        })
      }
      return {
        ...definition.paths[path][method],
        method,
        endpoint: path,
        parameters: parameters
          .map((config) => ({...config, type: config.schema.type, [config.in]: true}))
          .concat(form)
      }
    })
  )
  .reduce((all, arr) => all.concat(arr), [])
