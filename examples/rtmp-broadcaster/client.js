'use strict';

const createExample = require('../../lib/browser/example');

const description = 'Capture audio and video and broadcast it to a given RTMP ingest.';

const targetURLInput = document.createElement('input');
targetURLInput.type = 'text';
targetURLInput.value = 'rtmp://live.twitch.tv/app/YOUR-STREAM-KEY';

const localVideo = document.createElement('video');
localVideo.autoplay = true;
localVideo.muted = true;

async function beforeAnswer(peerConnection) {

  let dataChannel = null;

  function onDataChannel({ channel }) {
    if (channel.label === 'target') {
      dataChannel = channel;
    }
  }

  peerConnection.addEventListener('datachannel', onDataChannel);

  function onChange() {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(targetURLInput.value);
    }
  }

  targetURLInput.addEventListener('change', onChange);

  const localStream = await window.navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  localVideo.srcObject = localStream;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    localVideo.srcObject = null;

    localStream.getTracks().forEach(track => track.stop());

    return close.apply(this, arguments);
  };
}

createExample('broadcast-rtmp', description, { beforeAnswer }, 'MY_TEST_VARIABLE');

const targetURLLabel = document.createElement('label');
targetURLLabel.innerText = 'Target URL:';
targetURLLabel.appendChild(targetURLInput);
document.body.appendChild(targetURLLabel);

const videos = document.createElement('div');
videos.className = 'grid';
videos.appendChild(localVideo);
document.body.appendChild(videos);
