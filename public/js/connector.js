let socket = io()
let STUN_SERVER = 'stun:stun.l.google.com:19302'
let configuration = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
}
let constraints = {
  video: {
    width: 640,
    height: 480,
    frameRate: { ideal: 20, max: 30 },
    facingMode: 'user'
  },
  audio: true
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
    console.log('gathering cand')
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
      },
      err => console.log(err))
}

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
          },
          err => console.log(err)
        )
    },
    err => console.log(err))
  connections[data.name] = {self: conn, other: undefined}
}

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

socket.on('receiver', function (response) {
  let resp = JSON.parse(response)
  switch (resp.type) {
    case 'ice-candidate':
      handleIceCandidates(resp)
      break
    case 'video-offer':
      console.log('offer received', resp)
      handleOfferReceived(resp)
      break
    case 'video-answer':
      console.log('received answer on client')
      handleVideoAnswer(connections[resp.name].self, resp)
      break
  }
})
