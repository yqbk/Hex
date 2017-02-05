const express = require('express')
const http = require('http')
const port = process.env.PORT || 5000

const app = express()
const server = http.createServer(app)

app.get('/', (req, res) => {
  res.send('hello world!')
})

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})


