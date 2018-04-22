let socket = io()
let STUN_SERVER = 'stun:stun.l.google.com:19302'
let configuration = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
}
let constraints = {
  video: true
}

let vid1 = document.getElementById('selfVideo')
let vid2 = document.getElementById('otherVideo')

function sendToServer (msg) {
  console.log('sending')
  let str = JSON.stringify(msg)
  socket.emit('request', str)
}

socket.on('broadcast', function (msg) {
  console.log(msg)
})

let localStream = null

navigator.mediaDevices.getUserMedia(constraints)
  .then(stream => {
    localStream = stream
    vid1.srcObject = stream
  })
  .catch(err => console.log(err))

function createPeerConnection (name, targetPeer) {
  let conn = new RTCPeerConnection(configuration)
  let iceArray = []
  conn.onicecandidate = event => {
    console.log('gathering cand', event.candidate)
    if (!event.candidate && iceArray.length > 0) {
      let msg = {
        name: name,
        type: 'ice-candidate',
        target: targetPeer,
        candidate: iceArray
      }
      sendToServer(msg)
      iceCandidates[targetPeer] = iceArray
      iceArray = []
    } else {
      iceArray.push(event.candidate)
    }
  }
  conn.onnegotiationneeded = () => {
    const offerOptions = {
      offerToReceiveVideo: 1
    }
    conn.createOffer(offerOptions)
      .then((x) => {
        console.log('created offer', x)
        conn.setLocalDescription(x)
        let msg = {
          name: name,
          type: 'video-offer',
          target: targetPeer,
          sdp: x
        }
        console.log('sending offer')
        sendToServer(msg)
      // socket.emit('newOffer', JSON.stringify(x))
      })
  }
  conn.ontrack = event => {
    vid2.srcObject = event.streams[0]
  }
  return conn
}

function handleVideoAnswer (conn, answer) {
  let desc = new RTCSessionDescription(answer.sdp)
  conn.setRemoteDescription(desc)
    .then(
      () => {
        console.log('remote desc set, connection established')
        // connections[answer.name].self.addStream(localStream)
      },
      err => console.log(err))
}

socket.on('receiveAnswer', function (answer) {
  let ans = JSON.parse(answer)
  console.log('received answer on client')
  handleVideoAnswer(connections[ans.name].self, ans)
})

let connections = {}
let iceCandidates = {}
function handleIceCandidates (data) {
  console.log(data)
  iceCandidates[data.name] = data.candidate
  data.candidate.forEach(elem => {
    let cand = new RTCIceCandidate(elem)
    connections[data.name].self.addIceCandidate(cand).then(
      () => console.log('ice candidate added'),
      err => console.log(err)
    )
  })
}

function handleOfferReceived (data) {
  console.log('handling offer received')
  let conn = createPeerConnection('bob', data.name)
  conn.addStream(localStream)
  let _Offer = data.sdp
  let desc = new RTCSessionDescription(_Offer)
  console.log(desc)
  conn.setRemoteDescription(desc)
    .then(() => {
      console.log('creating answer')
      return conn.createAnswer()
    })
    .then(x => {
      conn.setLocalDescription(x)
        .then(
          () => {
            let nmsg = {
              name: 'bob',
              type: 'video-answer',
              sdp: x,
              target: data.name
            }
            sendToServer(nmsg)
            // socket.emit('receiveAnswer', JSON.stringify(x))
          },
          err => console.log(err)
        )
    },
    err => console.log(err))
  connections[data.name] = {self: conn, other: undefined}
}
socket.on('receiveCandidates', function (msg) {
  let data = JSON.parse(msg)
  handleIceCandidates(data)
})

socket.on('receiveOffer', function (msg) {
  console.log('offer received', msg)
  let data = JSON.parse(msg)
  handleOfferReceived(data)
})

function startCall (target) {
  let user = document.getElementById('userName').value
  let roomId = document.getElementById('roomId').value

  let selfConn = createPeerConnection(user, target)
  selfConn.addStream(localStream)
  console.log(selfConn)
  connections[target] = {self: selfConn, other: undefined}
}

document.getElementById('connectBtn').addEventListener('click', (event) => {
  console.log('clicked')
  let user = document.getElementById('userName').value
  let roomId = document.getElementById('roomId').value
  // socket.emit('joinroom', {user: user, roomId: roomId})
  startCall('bob')
})
