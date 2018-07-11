for (let k in R) {
  window[k] = R[k]
}
delete R

const $ = document.querySelectorAll.bind(document)
const I = document.getElementById.bind(document)
const T = template => obj =>
  compose(...values(mapObjIndexed((v, k) => replace(`|${k}|`, String(v)), obj)))(template)

map(template => {
  T[template.classList[0]] = T(template.outerHTML)
  template.parentNode.removeChild(template)
}, I('templates').children)

let fileIndex = 200

function blurAll(){
  const tmp = document.createElement("input")
  document.body.appendChild(tmp)
  tmp.focus()
  document.body.removeChild(tmp)
}
const redrawFiles = () => {
  I('card').innerHTML = T.card(FILES[fileIndex])
  Mousetrap(I('text')).bind('escape', e => {
    blurAll()
  })
}

const nextFile = (k = 1) => {
  fileIndex = clamp(0, length(FILES), fileIndex + k)
  console.log(fileIndex)
  redrawFiles()
}

const grade = quality => {
  const text = I("text").innerText
  const audio = FILES[fileIndex][1]
  ws.emit('grade', {text, quality, audio})
  nextFile()
}

ws.on('files', compose(redrawFiles, files => window.FILES = files))

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
