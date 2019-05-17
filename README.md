
# node-skyapi-sdk

SkyAPI v2 is based on [Open API] Specification.


## Generate SDK

```bash
npm run build
```


## Add v2 Lambda

1. Add your lambda as `devDependency` in package.json
2. Add reference to your lambda in `spec/openapi.yml`
3. Execute `npm run build`


## Add v1 Lambda

You can add manually a not [Open API] compliant v1 lambda:

1. Add your lambda as separate template in `codegen/templates/`
2. Add your lambda as additional partial in `codegen/render.js`
3. Include your partial in `codegen/templates/main.js`
4. Execute `npm run build`


  [Open API]: https://swagger.io/specification/
