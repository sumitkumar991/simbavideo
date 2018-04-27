const socket = io()
const STUN_SERVER = 'stun:stun.l.google.com:19302'
const configuration = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
}
const constraints = {
  video: {
    width: 640,
    height: 480,
    frameRate: {
      ideal: 20,
      max: 30
    },
    facingMode: 'user'
  },
  audio: true
}
const _get = x => document.getElementById(x)
let userData = {
  name: null
}
let vid1 = document.getElementById('selfVideo')
let vid2 = document.getElementById('otherVideo')
let startBtn = document.getElementById('startFeed')
let stopBtn = document.getElementById('stopFeed')

function sendToServer (msg) {
  console.log('sending')
  let str = JSON.stringify(msg)
  socket.emit('request', str)
}

socket.on('broadcast', function (msg) {
  console.log(msg)
})

let localStream = null

function startLocalVideo () {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        localStream = stream
        vid1.srcObject = stream
        resolve(localStream)
      })
      .catch(err => console.log(err))
  })
}

function stopLocalVideo () {
  let tracks = localStream.getTracks()
  tracks.forEach(track => {
    track.stop()
  })
}

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
        console.log('created offer')
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
  conn.onconnectionstatechange = event => {
    switch (conn.connectionState) {
      case 'closed':
        alert('connection closed')
        break
    }
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
  if (connections[data.name] !== undefined) {
    iceCandidates[data.name] = data.candidate
    data.candidate.forEach(elem => {
      let cand = new RTCIceCandidate(elem)
      connections[data.name].self.addIceCandidate(cand).then(
        () => console.log('ice candidate added'),
        err => console.log(err)
      )
    })
  }
}

function handleOfferReceived (data) {
  console.log('handling offer received')
  if (confirm(`${data.name} is calling`)) {
    let conn = createPeerConnection(userData.name, data.name)
    localStream.getTracks().forEach(track => {
      conn.addTrack(track, localStream)
    })
    let _Offer = data.sdp
    let desc = new RTCSessionDescription(_Offer)
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
                name: userData.name,
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
    connections[data.name] = {
      self: conn,
      other: undefined
    }
  } else {
    const response = {
      name: userData.name,
      type: 'reject-offer',
      target: data.name
    }
    sendToServer(response)
  }
}

function handleOfferRejected (data) {
  connections[data.name].self.close()
  delete connections[data.name]
  alert(`terminated connection with ${data.name}`)
}

function startCall (event) {
  let target = event.target.value
  if (target === '') {
    console.log('callee cannot be empty')
  } else {
    console.log('connecting')
    startLocalVideo()
      .then(() => {
        let user = document.getElementById('userName').value
        let selfConn = createPeerConnection(user, target)
        localStream.getTracks().forEach(track => {
          selfConn.addTrack(track, localStream)
        })
        connections[target] = {
          self: selfConn
        }
      })
  }
}

function disconnectCall (event) {
  let target = event.target.value
  if (connections[target] != null) {
    connections[target].self.close()
    delete connections[target]
    alert(`call with ${target} disconnected`)
  }
}

function joinRoom () {
  const name = _get('userName').value
  const room = _get('roomId').value
  userData.name = name
  socket.emit('attach-name', userData.name) // attaches name to server socket
  if (name === undefined || room === '') {
    console.log('name & room are required')
  } else {
    const req = {
      type: 'join-room',
      name: name,
      roomId: room
    }
    sendToServer(req)
  }
}

function initializeHandlers () {
  _get('joinRoom').addEventListener('click', joinRoom)
  startBtn.addEventListener('click', startLocalVideo)
  stopBtn.addEventListener('click', stopLocalVideo)
}

function createUserElement (name) {
  let li = document.createElement('li')
  let html = ['<li>',
    '<div class="columns">',
    '<div class="column"><a>' + name + '</a></div>',
    '<div class="column">',
    '<button name="callBtn" class="button is-small is-success" value="' + name + '">call</button>',
    '</div>',
    '<div class="column">',
    '<button name="hangupBtn" class="button is-small is-danger" value="' + name + '">Hang up</button>',
    '</div>',
    '</div>',
    '</li>'
  ].join('\n')
  li.innerHTML = html
  return li
}

function populateOnlineList (clientArr) {
  let list = clientArr.filter(x => x !== userData.name).map(x => createUserElement(x))
  let dom = _get('online')
  while (dom.firstChild) dom.removeChild(dom.firstChild)
  list.forEach(element => {
    dom.appendChild(element)
  })
  document.getElementsByName('callBtn').forEach(btn => {
    btn.addEventListener('click', startCall)
  })
  document.getElementsByName('hangupBtn').forEach(btn => {
    btn.addEventListener('click', disconnectCall)
  })
}
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
    case 'reject-offer':
      handleOfferRejected(resp)
      break
    case 'video-answer':
      console.log('received answer on client')
      handleVideoAnswer(connections[resp.name].self, resp)
      break
    case 'client-list':
      console.log('received client list')
      populateOnlineList(resp.clients)
  }
})

initializeHandlers()
