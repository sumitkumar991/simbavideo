module.exports = class ConnectionHandler {
  constructor (io) {
    this.ioConn = io
    this.connections = {}
  }

  getRoom (socket) {
    // get the room user is subscribed to
    return Object.keys(socket.rooms).filter(x => x !== socket.id)[0]
  }

  getNestedObj (dataObj, patharr) {
    return patharr.reduce((obj, key) => {
      return (obj && obj[key] != null ? obj[key] : undefined)
    }, dataObj)
  }
  getSocket (room, target) {
    return this.getNestedObj(this.connections, [room, target])
  }

  joinRoom (socket, data) {
    let roomId = data.roomId
    let room = this.connections[roomId]
    if (room != null) {
      if (room[data.name] === undefined) {
        if (Object.keys(room).length >= 10) {
          // cannot join room
          socket.emit('broadcast', `${data.roomId} is already full`)
        } else {
          socket.join(roomId, err => {
            if (err != null) console.log(err)
            else {
              room[data.name] = socket
              this.ioConn.to(roomId).emit('broadcast', `${data.name} has joined the room`)
              this.sendClientListToRoom(roomId)
            }
          })
        }
      } else {
        socket.emit('broadcast', `You are already member in this room ${roomId}`)
      }
    } else {
      socket.join(roomId, err => {
        if (err != null) console.log(err)
        else {
          this.connections[roomId] = {}
          this.connections[roomId][data.name] = socket
          this.ioConn.to(roomId).emit('broadcast', `${data.name} has joined the room ${roomId}`)
          this.sendClientListToRoom(roomId)
        }
      })
    }
  }

  relayToReceiver (socket, data) {
    if (socket != null) {
      socket.emit('receiver', JSON.stringify(data))
    }
  }

  relayIceCandidate (socket, data) {
    console.log('target', data.target)
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data.target)
    this.relayToReceiver(targetSocket, data)
  }

  relayVideoOffer (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data.target)
    this.relayToReceiver(targetSocket, data)
  }

  relayOfferRejection (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data.target)
    this.relayToReceiver(targetSocket, data)
  }

  relayVideoAnswer (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data.target)
    this.relayToReceiver(targetSocket, data)
  }

  getActiveRooms () {
    return Object.keys(this.connections)
  }

  getClients (room) {
    return Object.keys(this.connections[room])
  }
  sendClientList (socket) {
    let room = this.getRoom(socket)
    socket.emit('receiver', JSON.stringify({
      type: 'client-list',
      clients: this.getClients(room)
    })
    )
  }

  sendClientListToRoom (room) {
    this.ioConn.to(room).emit('receiver', JSON.stringify({
      type: 'client-list',
      clients: this.getClients(room)
    }))
  }
  // removes the disconnected user from connections
  removeUser (room, name) {
    delete this.connections[room][name]
    this.ioConn.to(room).emit('broadcast', `${name} has left the room`)
    this.sendClientListToRoom(room)
  }
}
