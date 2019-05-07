
const fs = require('fs')
const path = require('path')
const codegen = require('../codegen/')

;(async () => {
  const source = await codegen({
    spec: path.resolve(__dirname, '../spec/openapi.yml'),
  })
  fs.writeFileSync(path.resolve(__dirname, '../dist/skyapi.js'), source, 'utf-8')
})()
