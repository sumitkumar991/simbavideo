var socket = io()
let STUN_SERVER = 'stun:stun.l.google.com:19302'

document.getElementById('connectBtn').addEventListener('click', (event) => {
  // let user = document.getElementById('userName').value
  // let roomId = document.getElementById('roomId').value
  // socket.emit('joinroom', {user: user, roomId: roomId})
  invite()
})

socket.on('broadcast', function (msg) {
  console.log(msg)
})

let configuration = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
}
let constraints = {
  video: true
}
let vid1 = document.getElementById('selfVideo')

// function establishConn () {
//   let selfConn = new RTCPeerConnection(configuration)
//   let localStream = null

//   function handleStream (stream) {
//     vid1.srcObject = stream
//     localStream = stream
//     selfConn.addStream(localStream)
//   }

//   navigator.mediaDevices.getUserMedia(constraints)
//     .then(handleStream).catch(x => console.log(x))

//   selfConn.onicecandidate = event => {
//     console.log('got candidates', event.candidate)
//     if (event.candidate) {
//       console.log('sending candidate')
//       socket.emit('sendingCandidates', JSON.stringify(event.candidate))
//     }
//   }

//   const offerOptions = {
//     offerToReceiveVideo: 1
//   }

//   selfConn.createOffer(offerOptions)
//     .then((x) => {
//       console.log('created offer')
//       selfConn.setLocalDescription(x)
//       socket.emit('newOffer', JSON.stringify(x))
//     })
// }
/// //////////////
var peerConn = null
var hasAddTrack = null
function invite () {
  let selfConn = new RTCPeerConnection(configuration)
  let vid1 = document.getElementById('selfVideo')
  let localStream = null

  function handleStream (stream) {
    vid1.srcObject = stream
    localStream = stream
    selfConn.addStream(localStream)

    if (hasAddTrack) {
      console.log("-- Adding tracks to the RTCPeerConnection")
      localStream.getTracks().forEach(track => selfConn.addTrack(track, localStream));
    } else {
      console.log("-- Adding stream to the RTCPeerConnection")
      selfConn.addStream(localStream)
    }
  }
  hasAddTrack = selfConn.addTrack !== undefined
  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleStream).catch(x => console.log(x))

  selfConn.onicecandidate = event => {
    console.log('got candidates', event.candidate)
    if (event.candidate) {
      console.log('sending candidate')
      socket.emit('sendingCandidates', JSON.stringify(event.candidate))
    }
  }
  selfConn.onnegotiationneeded = handleNegotiationOffer

  if (hasAddTrack) {
    selfConn.ontrack = handleTrackEvent
  } else {
    selfConn.onaddstream = handleAddStreamEvent
  }

  peerConn = selfConn
  return peerConn
}

function handleAddStreamEvent (event) {
  vid1.srcObject = event.stream
}
function handleTrackEvent (event) {
  console.log('*** Track event');
  vid1.srcObject = event.streams[0];
}
function handleNegotiationOffer () {
  const offerOptions = {
    offerToReceiveVideo: 1
  }
  peerConn.createOffer(offerOptions)
    .then((x) => {
      console.log('created offer', x)
      peerConn.setLocalDescription(x)
      socket.emit('newOffer', JSON.stringify(x))
    })
}

function handleVideoOffer (conn, offer) {
  let _Offer = JSON.parse(offer)
  let desc = new RTCSessionDescription(_Offer)
  console.log(desc)
  conn.setRemoteDescription(desc)
    .then(
      () => {
        navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            vid1.srcObject = stream
            return conn.addStream(stream)
          }).catch(err => console.log(err))
      },
      err => console.log(err)
    )
}

function handleVideoAnswer (conn, answer) {
  let ans = Json.parse(answer)
  let desc = new RTCSessionDescription(ans)
  conn.setRemoteDescription(desc)
    .then(
      () => console.log('remote desc set'),
      err => console.log(err))
}
socket.on('receiveOffer', function (offer) {
  console.log('offer received')
  let conn = invite()
  handleVideoOffer(conn, offer)
    .then(() => conn.createAnswer())
    .then(x => {
      conn.setLocalDescription(x).then(
        () => socket.emit('receiveAnswer', JSON.stringify(x)),
        err => console.log(err)
      )
    },
    err => console.log(err))
})

socket.on('receiveAnswer', function (answer) {
  console.log('received answer on client')
  handleVideoAnswer(peerConn, answer)
})

socket.on('receiveCandidates', function (candidates) {
  console.log('received candidates', candidates)
  let cand = new RTCIceCandidate(JSON.parse(candidates))
  peerConn.addIceCandidate(cand).then(
    () => console.log('ice candidate added'),
    err => console.log(err)
  )
})
