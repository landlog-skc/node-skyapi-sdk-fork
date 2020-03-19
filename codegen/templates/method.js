/**
* {{{summary}}}
* {{{description}}}
* @method
* @name {{operationId}}
{{#parameters}}
* @param ({{type}}) {{name}} - {{{description}}}
{{/parameters}}
*/

api.{{operationId}} = async (params = {}, options = {}) => {
  let method = '{{method}}'.toUpperCase()
  let path = `/v${version || 2}` + '{{&endpoint}}'
  let query = {}
  let body = {}
  let security = {{security}}

  {{#parameters}}

    {{#path}}
    if (params['{{&name}}'] !== undefined) {
      path = path.replace('{' + '{{&name}}' + '}', params['{{&name}}'])
    }
    {{/path}}

    {{#query}}
    if (params['{{&name}}'] !== undefined) {
      query['{{&name}}'] = params['{{&name}}']
    }
    {{/query}}

    {{#body}}
    if (params['{{&name}}'] !== undefined) {
      body['{{&name}}'] = params['{{&name}}']
    }
    {{/body}}

  {{/parameters}}

  return api.request({method, path, query, body, security, options})
}
