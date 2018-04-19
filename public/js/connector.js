// var socket = null
var socket = io()

document.getElementById('connectBtn').addEventListener('click', (event) => {
  let user = document.getElementById('userName').value
  let roomId = document.getElementById('roomId').value
  socket.emit('joinroom', {user: user, roomId: roomId})
})

socket.on('broadcast', function (msg) {
  console.log(msg)
})
