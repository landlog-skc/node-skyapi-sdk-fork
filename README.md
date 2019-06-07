
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
3. Execute `npm run build:sdk`


## Add v1 Lambda

You can add manually a not [Open API] compliant v1 lambda:

1. Add your lambda as separate template in `codegen/templates/`
2. Add your lambda as additional partial in `codegen/render.js`
3. Include your partial in `codegen/templates/main.js`
4. Execute `npm run build:sdk`

### Debug Logs

Enable [debug] logs:

- `skyapi:sdk:request` - the request made by SkyAPI SDK
- `skyapi:sdk:response:status` - the response received by SkyAPI SDK
- `skyapi:sdk:response:headers` - the response received by SkyAPI SDK
- `skyapi:sdk:response:body` - the response received by SkyAPI SDK


  [Open API]: https://swagger.io/specification/
  [debug]: https://www.npmjs.com/package/debug
