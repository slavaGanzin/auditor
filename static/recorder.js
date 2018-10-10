//https://github.com/gabrielpoca/browser-pcm-stream

(function(window) {
  let client = new BinaryClient('ws://127.0.0.1:9002')

  client.on('open', () => {
    // window.Stream = client.createStream();

    if (!navigator.getUserMedia)
    {navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia}

    if (navigator.getUserMedia) {
      navigator.getUserMedia({audio:true}, success, (e) => {
        alert('Error capturing audio.')
      })
    } else alert('getUserMedia not supported in this browser.')

    window.recording = false

    window.startRecording = function() {
      window.Stream = client.createStream()
      recording = true
    }

    window.stopRecording = function() {
      recording = false
      window.Stream.end()
    }

    function success(e) {
      audioContext = window.AudioContext || window.webkitAudioContext
      context = new audioContext()

      // the sample rate is in context.sampleRate
      audioInput = context.createMediaStreamSource(e)

      let bufferSize = 2048
      recorder = context.createScriptProcessor(bufferSize, 1, 1)

      recorder.onaudioprocess = function(e){
        if(!recording) return
        console.log ('recording')
        const left = e.inputBuffer.getChannelData(0)
        window.Stream.write(convertoFloat32ToInt16(left))

      }

      audioInput.connect(recorder)
      recorder.connect(context.destination)
    }

    function convertoFloat32ToInt16(buffer) {
      let l = buffer.length
      let buf = new Int16Array(l)

      while (l--)
        buf[l] = buffer[l]*0xFFFF //convert to 16 bit

      return buf.buffer
    }
  })
})(this)
