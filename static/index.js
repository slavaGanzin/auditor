const ws = io.connect('http://127.0.0.1:65533')

let fileIndex = 0

const redrawCard = () => {
  T.card(FILES[fileIndex])
  Mousetrap(I('text')).bind('escape', e => {
    blurAll()
  })
  Mousetrap(I("audio")).bind('space', e => e.stopPropagation())

  // I('grade').style.opacity = 0
  // I('audio').addEventListener('progress',
  //   x => I('grade').style.opacity = 1
  // )
}

const updateText = () => {
  FILES[fileIndex][0] = I('text').innerText
}

const nextFile = (k = 1) => {
  fileIndex = clamp(0, length(FILES), fileIndex + k)
  redrawCard()
}

const getFileParams = () => ({
  textFile: FILES[fileIndex][2],
  text: I('text').innerText,
  audio: I('audio').src.replace(/\?.*/,'').replace(/.*\/data\//, 'data/')
})

const grade = quality => {
  const grade = getFileParams()
  grade.quality = quality

  ws.emit('grade', grade)
  nextFile()
}

const rewind = sec =>
  I('audio').currentTime = clamp(0, I('audio').duration, I('audio').currentTime + sec)

const record = () => {
  if(window.recording) {
    $('#record .button')[0].classList.remove('recording')
    return window.stopRecording()
  }

  ws.emit('record:start', getFileParams())
  $('#record .button')[0] .classList.add('recording')
  window.startRecording()
}

ws.on('files', compose(redrawCard, files => window.FILES = files))

ws.on('update:audio', () =>
  I('audio').src = 'data/recorder.mp3?' + Math.random()
)

ws.on('show:error', x => alert(`Зовите Славу: ${JSON.stringify(x, null, 2)}`))

Mousetrap
  .bind('tab', e => {
    e.preventDefault()
    I('text').focus()
  })
  .bind('space', () => I('audio').paused ? I('audio').play() : I('audio').pause())
  .bind('left', () => rewind(-1))
  .bind('right', () => rewind(1))
  .bind('ctrl+left', () => rewind(-10))
  .bind('ctrl+right', () => rewind(10))
  .bind('up', () => nextFile(-1))
  .bind('down', () => nextFile(1))
  .bind('1', () => grade(1))
  .bind('2', () => grade(2))
  .bind('3', () => grade(3))
  .bind('4', () => grade(4))
  .bind('5', () => grade(5))
  // .bind(['r', 'к'], record)
