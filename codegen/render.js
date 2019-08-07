
const fs = require('fs')
const path = require('path')
const mustache = require('mustache')
const beautify = require('js-beautify').js

const template =
  fs.readFileSync(path.resolve(__dirname, 'templates/main.js'), 'utf8')

const partials = {
  method:
    fs.readFileSync(path.resolve(__dirname, 'templates/method.js'), 'utf8'),
  // until lambda function is migrated to Open API ..
  getProcessingJob:
    fs.readFileSync(path.resolve(__dirname, 'templates/get-processing-job.js'), 'utf8'),
}

module.exports = (view) =>
  beautify(
    mustache.render(template, view, partials),
    // https://www.npmjs.com/package/js-beautify#options
    {
      indent_size: 2,
      indent_empty_lines: false,
      max_preserve_newlines: 2,
    }
  )
