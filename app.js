const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const app = express()

const http = require('http').createServer(app)
const io = require('socket.io')(http)

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

app.use('/', express.static('./static'))

const api = express.Router()
app.use('/api', api)

api.use(bodyParser.json())
api.use((req, res, next) => {
  if (!req.headers.authorization) {
    res.status(401)
  } else if (req.headers.authorization !== config.euler_token) {
    // accessing the following parameters requries authorization
    res.status(403)
  } else {
    next()
  }
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

http.listen(config.port, () => {
  console.log(`Euler is listening on port ${config.port}`)
})
