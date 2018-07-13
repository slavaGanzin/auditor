for (let k in R) 
  window[k] = R[k]

delete R

const $ = document.querySelectorAll.bind(document)
const I = document.getElementById.bind(document)
const T = template => obj =>
  compose(...values(mapObjIndexed((v, k) => replace(`|${k}|`, String(v)), obj)))(template)

map(template => {
  T[template.classList[0]] = T(template.outerHTML)
  template.parentNode.removeChild(template)
}, I('templates').children)

function blurAll(){
  const tmp = document.createElement("input")
  document.body.appendChild(tmp)
  tmp.focus()
  document.body.removeChild(tmp)
}
