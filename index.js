const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')

const port = process.env.PORT || 5000

const compiler = webpack(config)

const app = express()
const server = http.createServer(app)

app.get('/hello', async (req, res) => {
  res.send('hello world!')
})

app.use(history({
  index: '/index.html'
}))

app.use(express.static('static'))

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}))

app.use(require('webpack-hot-middleware')(compiler))

server.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.log(err) // eslint-disable-line
    return
  }

  console.log(`Listening on port ${port}`)  // eslint-disable-line
})
