module.exports = class ConnectionHandler {
  constructor (io) {
    this.ioConn = io
    this.connections = {}
    this.activeRooms = []
  }

  getRoom (socket) {
    return Object.keys(socket.rooms)[0]
  }

  getSocket (room, target) {
    return this.connections[room][target]
  }

  joinRoom (socket, data) {
    let roomId = data.roomId
    let room = this.connections[roomId]
    if (room != null) {
      if (Object.keys(room).length >= 10) {
        // cannot join room
        socket.emit('broadcast', `${data.roomId} is already full`)
      } else {
        socket.join(roomId, err => {
          if (err != null) console.log(err)
          else {
            room[data.name] = socket
            this.ioConn.to(roomId).emit('broadcast', `${data.name} has joined the room`)
          }
        })
      }
    } else {
      socket.join(roomId, err => {
        if (err != null) console.log(err)
        else {
          this.connections[roomId] = {}
          this.connections[roomId][data.name] = socket
          this.ioConn.to(roomId).emit('broadcast', `${data.name} has joined the room`)
        }
      })
    }
  }

  relayToReceiver (socket, data) {
    socket.emit('receiver', JSON.stringify(data))
  }

  relayIceCandidate (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data.target)
    this.relayToReceiver(targetSocket, data)
  }

  relayVideoOffer (socket, data) {
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
    return this.activeRooms
  }
}
