var express = require('express')
var app = require('express')()
var http = require('http').Server(app)
var path = require('path')
var io = require('socket.io')(http)

app.use(express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/html/app.html'))
})

io.on('connection', function (socket) {
  console.log('a client connected')
  socket.on('joinroom', function (data) {
    let roomId = data.roomId
    socket.join(roomId, err => {
      if (err != null) console.log(err)
      io.to(roomId).emit('broadcast', `${data.user} has joined the room`)
    })
    socket.on('disconnect', function (reason) {
      let rooms = Object.keys(socket.rooms)
      console.log('disconnected', rooms)
      io.to(rooms).emit('broadcast', `${data.name} has disconnected`)
    })
  })
})

http.listen(3000, function () {
  console.log('listening on *:3000')
})
