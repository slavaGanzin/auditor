let fileIndex = 0

const redrawCard = () => {
  I('card').innerHTML = T.card(FILES[fileIndex])
  Mousetrap(I('text')).bind('escape', e => {
    blurAll()
  })
  I('audio').addEventListener('progress',()=>$('.buttons'),false)
}

const nextFile = (k = 1) => {
  fileIndex = clamp(0, length(FILES), fileIndex + k)
  redrawCard()
}

const grade = quality => {
  const text = I("text").innerText
  const audio = FILES[fileIndex][1]
  ws.emit('grade', {text, quality, audio})
  nextFile()
}

const record = () => {
  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(stream => {
    const recorder = new MediaRecorder(stream)
  })
}

ws.on('files', compose(redrawCard, files => window.FILES = files))

Mousetrap
  .bind('tab', e => {
    e.preventDefault()
    I('text').focus()
  })
  .bind('space', () => I('audio').paused ? I('audio').play() : I('audio').pause())
  .bind('left',  () => I('audio').currentTime = clamp(0, I('audio').duration,  I('audio').currentTime - 5))
  .bind('right', () => I('audio').currentTime = clamp(0, I('audio').duration-1,  I('audio').currentTime + 5))
  .bind('up', () => nextFile(-1))
  .bind('down', () => nextFile(1))
  .bind('1', () => grade(1))
  .bind('2', () => grade(2))
  .bind('3', () => grade(3))
  .bind('4', () => grade(4))
  .bind('5', () => grade(5))
