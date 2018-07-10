for (let k in R) {
  window[k] = R[k]
}
delete R

const $ = document.getElementsByClassName.bind(document)
const I = document.getElementById.bind(document)
const T = template => obj =>
  compose(...values(mapObjIndexed((v, k) => replace(`|${k}|`, String(v)), obj)))(template)

map(template => {
  template.classList.remove('template')
  const k = template.classList[0]
  T[k] = T(template.outerHTML)
}, I('templates').children)

const redrawFiles = () =>
  I('table').innerHTML = join('\n', (map(T.row, FILES.slice(0,10))))

ws.on('files', compose(redrawFiles, files => window.FILES = files))
