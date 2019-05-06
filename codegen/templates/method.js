/**
* {{summary}}
* {{description}}
* @method
* @name {{operationId}}
{{#parameters}}
* @param ({{type}}) {{name}} - {{description}}
{{/parameters}}
*/

async {{operationId}} (params) {
  let method = '{{method}}'.toUpperCase()
  let path = '{{&path}}'
  let query = {}
  let body = {}

  {{#parameters}}

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

  return request({method, path, query, body})
}
