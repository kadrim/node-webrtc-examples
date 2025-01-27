node-webrtc-examples
====================

This project presents a few example applications using node-webrtc.

- [audio-video-loopback](examples/audio-video-loopback): relays incoming audio
  and video using RTCRtpTransceivers.
- [ping-pong](examples/ping-pong): simple RTCDataChannel ping/pong example.
- [pitch-detector](examples/pitch-detector): pitch detector implemented using
  RTCAudioSink and RTCDataChannel.
- [sine-wave](examples/sine-wave): generates a sine wave using RTCAudioSource;
  frequency control implemented using RTCDataChannel.
- [sine-wave-stereo](examples/sine-wave-stereo): generates a stereo sine wave
  using RTCAudioSource; panning control implemented using RTCDataChannel.
- [video-compositing](examples/video-compositing): uses RTCVideoSink,
  [node-canvas](https://github.com/Automattic/node-canvas), and RTCVideoSource
  to draw spinning text on top of an incoming video.
- [record-audio-video-stream](examples/record-audio-video-stream) using [FFmpeg](https://www.ffmpeg.org) and RTCVideoSink.
- Broadcast example with one [broadcaster](examples/broadcaster) forwarding to many [viewers](examples/viewer).

Usage
-----

Install the project's dependencies and run the tests before starting the
application server:

```
npm install
npm test
npm start
```

Then, navigate to [http://localhost:3000](http://localhost:3000).

Docker
------

Run the following commands to use the whole project within docker:

```
$ docker build -t node-webrtc-examples .
$ docker run --rm --network host node-webrtc-examples
```

*Note: host-mode currently only works on Linux!*

Architecture
------------

Each example application under [examples/](examples) has a Client and Server
component. RTCPeerConnection negotiation is supported via a REST API (described
below), and is abstracted away from each example application. Code for
RTCPeerConnection negotiation lives under [lib/](lib).

### RTCPeerConnection Negotiation

RTCPeerConnections are negotiated via REST API. The Server always offers (with
host candidates) and the Client always answers. In order to negotiate a new
RTCPeerConnection, the Client first POSTs to `/connections`. The Server responds
with an RTCPeerConnection ID and SDP offer. Finally, the Client POSTs an SDP
answer to the RTCPeerConnection's URL.

```
Client                                               Server
  |                                                     |
  |  POST /connections                                  |
  |                                                     |
  |---------------------------------------------------->|
  |                                                     |
  |                                             200 OK  |
  |  { "id": "$ID", "localDescription": "$SDP_OFFER" }  |
  |                                                     |
  |<----------------------------------------------------|
  |                                                     |
  |  POST /connections/$ID/remote-description           |
  |  $SDP_ANSWER                                        |
  |                                                     |
  |---------------------------------------------------->|
  |                                                     |
  |                                             200 OK  |
  |                                                     |
  |<----------------------------------------------------|
```

### RTCPeerConnection Teardown

RTCPeerConnections can be proactively torn down by sending a DELETE to the
RTCPeerConnection's URL; otherwise, ICE disconnection or failure, if unresolved
within the `timeToReconnect` window, will also trigger teardown. The default
`timeToReconnect` value is 10 s.

```
Client                                               Server
  |                                                     |
  |  DELETE /connections/$ID                            |
  |                                                     |
  |---------------------------------------------------->|
  |                                                     |
  |                                             200 OK  |
  |                                                     |
  |<----------------------------------------------------|
```
