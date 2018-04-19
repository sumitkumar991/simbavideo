var socket = io()
let STUN_SERVER = 'stun:stun.l.google.com:19302'

document.getElementById('connectBtn').addEventListener('click', (event) => {
  // let user = document.getElementById('userName').value
  // let roomId = document.getElementById('roomId').value
  // socket.emit('joinroom', {user: user, roomId: roomId})
  establishConn()
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

function establishConn () {
  let selfConn = new RTCPeerConnection(configuration)
  let vid1 = document.getElementById('selfVideo')
  let localStream = null

  function handleStream (stream) {
    vid1.srcObject = stream
    localStream = stream
    selfConn.addStream(localStream)
  }

  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleStream).catch(x => console.log(x))

  selfConn.onicecandidate = event => {
    console.log('got candidates', event.candidate)
    if (event.candidate) {
      console.log('sending candidate')
      socket.emit('sendingCandidates', JSON.stringify(event.candidate))
    }
  }

  const offerOptions = {
    offerToReceiveVideo: 1
  }

  selfConn.createOffer(offerOptions)
    .then((x) => {
      console.log('created offer')
      selfConn.setLocalDescription(x)
      socket.emit('newOffer', JSON.stringify(x))
    })

  socket.on('receiveOffer', function (offer) {
    console.log('offer received')
    let _Offer = JSON.parse(offer)
    let desc = new RTCSessionDescription(_Offer)
    console.log(desc)
    selfConn.setRemoteDescription(desc)
      .then(
        () => {
          selfConn.createAnswer().then(x => {
            selfConn.setLocalDescription(x).then(
              () => socket.emit('receiveAnswer', JSON.stringify(x)),
              err => console.log(err)
            )
          },
          err => console.log(err))
        },
        err => console.log(err)
      )
  })

  socket.on('receiveAnswer', function (answer) {
    console.log('received answer on client')
    selfConn.setRemoteDescription(JSON.parse(answer)).then(
      () => console.log(`remote desc set`),
      err => console.log(err)
    )
  })

  socket.on('receiveCandidates', function (candidates) {
    console.log('received candidates', candidates)
    let cand = new RTCIceCandidate(JSON.parse(candidates))
    selfConn.addIceCandidate(cand).then(
      () => console.log('ice candidate added'),
      err => console.log(err)
    )
  })
}
