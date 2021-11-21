'use strict';

const { PassThrough } = require('stream')
const fs = require('fs')

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const { StreamInput } = require('fluent-ffmpeg-multistream')

const VIDEO_OUTPUT_SIZE = '320x240'
const VIDEO_OUTPUT_FILE = './recording.mp4'
const TARGET_URL = 'rtmp://live.twitch.tv/app/YOUR-STREAM-KEY'

let UID = 0;

function beforeOffer(peerConnection) {

  console.log(peerConnection);

  const dataChannel = peerConnection.createDataChannel('target');

  function onMessage({ data }) {
    console.log(data);
    TARGET_URL = data;
  }

  dataChannel.addEventListener('message', onMessage);

  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
  const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

  const streams = [];

  videoSink.addEventListener('frame', ({ frame: { width, height, data }}) => {
    const size = width + 'x' + height;
    if (!streams[0] || (streams[0] && streams[0].size !== size)) {
      UID++;

      const stream = {
        targetURL: TARGET_URL,
        size,
        video: new PassThrough(),
        audio: new PassThrough()
      };

      const onAudioData = ({ samples: { buffer } }) => {
        if (!stream.end) {
          stream.audio.push(Buffer.from(buffer));
        }
      };

      audioSink.addEventListener('data', onAudioData);

      stream.audio.on('end', () => {
        audioSink.removeEventListener('data', onAudioData);
      });

      streams.unshift(stream);

      streams.forEach(item=>{
        if (item !== stream && !item.end) {
          item.end = true;
          if (item.audio) {
            item.audio.end();
          }
          item.video.end();
        }
      })
  
      stream.proc = ffmpeg()
        .addInput((new StreamInput(stream.video)).url)
        .addInputOptions([
          '-f', 'rawvideo',
          '-pix_fmt', 'yuv420p',
          '-s', stream.size,
          '-r', '30',
        ])
        .addInput((new StreamInput(stream.audio)).url)
        .addInputOptions([
          '-f s16le',
          '-ar 48k',
          '-ac 1',
        ])
        .on('start', ()=>{
          console.log('Start recording >> ', stream.recordPath)
        })
        .on('end', ()=>{
          stream.recordEnd = true;
          console.log('Stop recording >> ', stream.recordPath)
        })
        .on('stdout', (stdoutLine) => {
          console.log('Stdout output: ' + stdoutLine);
        })
        .on('stderr', (stderrLine) => {
          console.log('Stderr output: ' + stderrLine);
        })
        .size(VIDEO_OUTPUT_SIZE)
        .outputOptions([
          '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-b:v', '3000k',
          '-c:a', 'aac', '-ar', '44100', '-b:a', '64k',
          '-bufsize', '1000',
          '-f', 'flv',
        ])
        .output(stream.targetURL);

        console.log(stream);

        stream.proc.run();
    }

    streams[0].video.push(Buffer.from(data));
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    dataChannel.removeEventListener('message', onMessage);

    audioSink.stop();
    videoSink.stop();

    streams.forEach(({ audio, video, end, proc, recordPath })=>{
      if (!end) {dm
        if (audio) {
          audio.end();
        }
        video.end();
      }
    });

    let totalEnd = 0;
    const timer = setInterval(()=>{
      streams.forEach(stream=>{
        if (stream.recordEnd) {
          totalEnd++;
          if (totalEnd === streams.length) {
            clearTimeout(timer);

            const mergeProc = ffmpeg()
              .on('start', ()=>{
                console.log('Start merging into ' + VIDEO_OUTPUT_FILE);
              })
              .on('end', ()=>{
                streams.forEach(({ recordPath })=>{
                  fs.unlinkSync(recordPath);
                })
                console.log('Merge end. You can play ' + VIDEO_OUTPUT_FILE);
              });
        
            streams.forEach(({ recordPath })=>{
              mergeProc.addInput(recordPath)
            });
        
            mergeProc
              .output(VIDEO_OUTPUT_FILE)
              .run();
          }
        }
      });
    }, 1000)

    return close.apply(this, arguments);
  }
}

module.exports = { beforeOffer };
