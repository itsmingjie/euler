const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./config')
const app = express()

const http = require('http').createServer(app)
const io = require('socket.io')(http, {
  pingInterval: 20000,
  pingTimeout: 10000
})

const redis = require('redis')
const redisAdapter = require('socket.io-redis')
const pub = redis.createClient(config.redis)
const sub = redis.createClient(config.redis)

io.adapter(redisAdapter({ pubClient: pub, subClient: sub }))

io.on('connection', (socket) => {
  socket.on('join', (id) => {
    // user who logged in connected
    socket.join(id)
  })
})

app.use(cors())
app.use('/', express.static('./static'))

const api = express.Router()
app.use('/api', api)

api.use(bodyParser.json())
api.use((req, res, next) => {
  console.log(req.headers)

  if (!req.headers.authorization) {
    res.status(401).json({
      success: false,
      title: 'Unauthorized!',
      message: 'Authentication token required.'
    })
  } else if (req.headers.authorization !== config.euler_token) {
    res.status(403).json({
      success: false,
      title: 'Invalid Token!',
      message: 'Authentication token required.'
    })
  } else {
    next()
  }
})

api.get('/ping', (req, res) => {
  res.send('pong')
})

api.post('/alert', (req, res) => {
  const id = req.body.id

  if (id) {
    // cast to the team only
    if (io.sockets.adapter.rooms[id]) {
      io.to(id).emit('alert', req.body.message)
      res.json({
        success: true,
        title: 'Success!',
        message: `An alert has been sent to all members of ${id} who are currently online.`
      })
    } else {
      // room does not exist
      res.json({
        success: false,
        title: 'No Clients Found',
        message: `The team you're trying to reach may be currently offline, because the room ${id} does not exist.`
      })
    }
  } else {
    // cast to EVERYONE
    io.emit('alert', req.body.message)
    res.json({
      success: true,
      title: 'Success!',
      message: `An alert has been sent to all teams ${id} who are currently online.`
    })
  }
})

api.post('/announcement', (req, res) => {
  io.emit('announcement', req.body.id)
  res.json({
    success: true,
    title: 'Success!',
    message: `An announcement has been posted to everyone.`
  })
})

api.post('/refresh', (req, res) => {
  io.emit('refresh')
  res.json({
    success: true,
    title: 'Success!',
    message: `A refresh intent has been sent to all teams online. Their pages will be reloaded within the next 10-20 seconds.`
  })
})

http.listen(config.port, () => {
  console.log(`Euler is listening on port ${config.port}`)
})
