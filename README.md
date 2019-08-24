
# node-skyapi-sdk

SkyAPI v2 is based on [Open API] Specification.


## Generate Output

All outputs go inside the `dist/` folder:

```bash
npm run build:json
npm run build:yaml
npm run build:sdk
npm run build # all
```


## Add v2 Lambda

1. Add your lambda as `devDependency` in package.json
2. Add reference to your lambda in `spec/openapi.yml`
3. Execute `npm run build`


## Add v1 Lambda

A non [Open API] compliant v1 lambda can be added as follows:

1. Add your lambda as separate template in `codegen/templates/`
2. Add your lambda as additional partial in `codegen/render.js`
3. Include your partial in `codegen/templates/main.js`
4. Execute `npm run build`

## Debug Logs

Enable [debug] logs:

```bash
DEBUG=@skycatch/* node app.js
```


  [Open API]: https://swagger.io/specification/
  [debug]: https://www.npmjs.com/package/debug
