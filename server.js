var express = require('express')
var app = require('express')()
var http = require('http').Server(app)
var path = require('path')
var io = require('socket.io')(http)
var Handler = new (require('./js/rooms'))(io)

app.use(express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/html/app.html'))
})

io.on('connection', function (socket) {
  console.log('a client connected')
  socket.on('attach-name', function (name) {
    // attach name to socket to identify on disconnection
    socket.username = name
  })
  socket.on('disconnecting', function (reason) {
    if (socket.username != null) {
      let room = Object.keys(socket.rooms)[0]
      Handler.removeUser(room, socket.username)
    }
  })
  socket.on('disconnect', function (reason) {
    console.log('disconnected')
  })

  socket.on('request', function (data) {
    // be careful of while passing data, stringified/json
    let req = JSON.parse(data)
    switch (req.type) {
      case 'join-room':
        console.log('on server joining room')
        Handler.joinRoom(socket, req)
        break
      case 'ice-candidate':
        console.log('received candidate on server')
        Handler.relayIceCandidate(socket, req)
        break
      case 'video-offer':
        console.log('new offer on server')
        Handler.relayVideoOffer(socket, req)
        break
      case 'video-answer':
        console.log('answer received on server')
        Handler.relayVideoAnswer(socket, req)
        break
      case 'client-list':
        console.log('getting client list')
        Handler.sendClientList(socket)
    }
  })
})

http.listen(process.env.PORT || 3000, function () {
  console.log('Server Started')
})
