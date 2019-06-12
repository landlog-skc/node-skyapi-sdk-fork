'use strict'

if (!global.it) {
  require('tap').mochaGlobals()
}
const t = require('assert').strict
const http = require('http')
const jws = require('jws')
const SkyAPI = require('../dist/skyapi') // in order to have test coverage

const token = (payload) => jws.sign({
  header: {typ: 'JWT', alg: 'HS256'},
  payload,
  secret: 'shhhh',
})

const origin = 'http://localhost:5000'

describe('client', () => {
  let server

  before((done) => {
    server = http.createServer()
    server.listen(5000, done)
  })

  after((done) => {
    server.close(done)
  })

  describe('refresh', () => {
    let listener = (req, res) => {
      let body = ''
      req.on('data', (chunk) => body += chunk)
      req.on('end', () => {
        body = JSON.parse(body)
        // refresh
        if (body.grant_type === 'client_credentials') {
          res.end(JSON.stringify({
            access_token: token({
              exp: Math.floor((Date.now() + 5000) / 1000),
              key: body.client_id,
              secret: body.client_secret
            })
          }))
        }
        // dataset
        else {
          const jwt = jws.decode(req.headers.authorization.replace('Bearer ', ''))
          res.end(JSON.stringify(jwt.payload))
        }
      })
    }

    before(() => {
      server.on('request', listener)
    })

    after(() => {
      server.removeListener('request', listener)
    })

    it('refresh on missing token', async () => {
      const skyapi = SkyAPI({
        origin,
        key: 'key 1',
        secret: 'secret 1'
      })
      const res = await skyapi.createDataset()
      t.equal(res.key, 'key 1')
      t.equal(res.secret, 'secret 1')
    })

    it('refresh on expired token', async () => {
      const skyapi = SkyAPI({
        origin,
        token: token({exp: Math.floor((Date.now() - 5000) / 1000)}),
        key: 'key 2',
        secret: 'secret 2'
      })
      const res = await skyapi.createDataset()
      t.equal(res.key, 'key 2')
      t.equal(res.secret, 'secret 2')
    })
  })

  it('do not add authorization header on missing credentials', async () => {
    server.once('request', (req, res) => {
      t.equal(req.headers.authorization, undefined)
      t.equal(req.method, 'GET')
      t.equal(req.url, '/v2/projections')
      res.end(JSON.stringify({}))
    })
    const skyapi = SkyAPI({
      origin
    })
    await skyapi.getProjections()
  })

  it('append querystring to the URL', async () => {
    server.once('request', (req, res) => {
      t.equal(req.url, '/v2/projections?lon=1&lat=2')
      res.end(JSON.stringify({}))
    })
    const skyapi = SkyAPI({
      origin
    })
    await skyapi.getProjections({
      lon: 1,
      lat: 2
    })
  })

  it('set content-type to application/json for put, post and patch methods', async () => {
    server.once('request', (req, res) => {
      t.equal(req.method, 'POST')
      t.equal(req.url, '/v2/datasets')
      t.equal(req.headers['content-type'], 'application/json')
      res.end(JSON.stringify({}))
    })
    const skyapi = SkyAPI({
      origin,
      token: token({exp: Math.floor((Date.now() + 5000) / 1000)})
    })
    await skyapi.createDataset({
      name: 'name'
    })
  })

  it('throw error on 4xx and 5xx response status codes', async () => {
    server.once('request', (req, res) => {
      res.statusCode = 404
      res.end(JSON.stringify({error: 'message'}))
    })
    const skyapi = SkyAPI({
      origin,
      token: token({exp: Math.floor((Date.now() + 5000) / 1000)})
    })
    try {
      await skyapi.createDataset()
    }
    catch (err) {
      t.deepEqual(JSON.parse(err.message), {error: 'message'})
    }
  })

})
