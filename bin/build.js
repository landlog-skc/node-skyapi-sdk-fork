
const fs = require('fs')
const path = require('path')
const openapi = require('../spec/openapi.js')
const codegen = require('../codegen/')

const spec = path.resolve(__dirname, '../spec/openapi.yml')
const output = process.argv[2]


;(async () => {
  const {json, yaml} = await openapi({spec})

  const source = {
    json,
    yaml,
    sdk: await codegen({json})
  }
  const ext = {
    json: 'json',
    yaml: 'yml',
    sdk: 'js',
  }

  fs.writeFileSync(
    path.resolve(__dirname, `../dist/skyapi.${ext[output]}`),
    output === 'json' ? JSON.stringify(source[output], null, 2) : source[output],
    'utf-8'
  )
})()
