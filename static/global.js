for (let k in R)
  window[k] = R[k]

delete R

const $ = document.querySelectorAll.bind(document)
const I = document.getElementById.bind(document)
const T = template => obj =>
  compose(...values(mapObjIndexed((v, k) => replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)), obj)))(template)

map(template => {
  const id = template.classList[0]
  T[id] = compose(
    html => I(id).innerHTML = html,
    T(template.outerHTML)
  )
}, I('templates').children)

$('body')[0].removeChild(I('templates'))


function blurAll(){
  const tmp = document.createElement("input")
  document.body.appendChild(tmp)
  tmp.focus()
  document.body.removeChild(tmp)
}
