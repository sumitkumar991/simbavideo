export class ConnectionHandler {
  constructor (io) {
    this.ioConn = io
    this.connections = {}
    this.activeRooms = []
  }
  getRoom (socket) {
    return Object.keys(socket.rooms)[0]
  }

  getSocket (room, data) {
    return this.connections[room][data.target]
  }
  reply (room, username, message) {
    // send any message to a user
  }
  addUser (socket, data) {
    let roomId = data.roomId
    let room = this.connections[roomId]
    if (Object.keys(room).length >= 10) {
      // cannot join room
    } else {
      room[data.name] = socket
    }
  }

  relayToReceiver (socket, data) {
    socket.emit('receiver', data)
  }

  relayIceCandidate (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data)
    this.relayToReceiver(targetSocket, data)
  }

  relayVideoOffer (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data)
    this.relayToReceiver(targetSocket, data)
  }

  relayVideoAnswer (socket, data) {
    let room = this.getRoom(socket)
    let targetSocket = this.getSocket(room, data)
    this.relayToReceiver(targetSocket, data)
  }

  getActiveRooms () {
    return this.activeRooms
  }
}
