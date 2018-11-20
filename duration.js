#!/usr/bin/env node
require('events').EventEmitter.defaultMaxListeners = 100

for (let k in require('ramda'))
  global[k] = require('ramda')[k]
const fs = require('fs')
const path = require('path')
const fsReaddirRecursive = require('fs-readdir-recursive')
const csv = require('oh-csv')
const d = require('date-fns')
const Transform = require('stream').Transform
const cp = mapObjIndexed(require('util').promisify, require('child_process'))
const mergeStream = require('merge2')

const csvOptions = {
  fields: ['text', 'validated', 'quality', 'now', 'duration'],
  quote: '"',
}
const DIR = path.resolve(process.argv[2]) + '/'

const getDuration = x =>
  cp.exec(`soxi -D "${x}"`, {encoding: 'utf8'})
    .then(({stdout, stderr}) => parseFloat(stdout) || 0)
    .catch(x => {
      return Promise.resolve(0)
    })
    .then(tap(duration => console.error(duration, x)))

let total = []
const addToTotal = tap(total.push.bind(total))

const transformer = () => new Transform({
  objectMode: true,
  transform(row, encoding, cb) {
    if (row.duration!='null' && row.duration > 0)
      return cb(null, addToTotal(row))

    getDuration(DIR+row.validated.replace(/\d{13}\./, '')).then(duration =>
      cb(null, addToTotal(merge(row, {duration})))
    )
  }
})

const pathTransformer = p => new Transform({
  objectMode: true,
  transform(row, encoding, cb) {
    const validated = path.relative(
      DIR,
      p + '/' + row.validated.replace(/.*\\validated/gim, '')
    )

    // cb(null, merge(row, {validated}))
    fs.copyFile(DIR+validated, DIR+validated.replace(/\d{13}\./, ''), () =>
      fs.unlink(DIR+validated, () =>
        cb(null, merge(row, {validated: validated.replace(/\d{13}\./, '')}))
      )
    )
  }
})

const getDay = x => d.format(d.parse(Date.parse(x.now)), 'DD MMMM YY')
const aggregateByDate = groupBy(getDay)

const spec = applySpec({
  "файлов": length,
  "обработано в часах": compose(x => x.toFixed(2), divide(__, 60*60), sum, pluck('duration')),
  "дата": compose(getDay, head),
  "рабочее время": compose(
    converge((x,y)=> parseFloat(((y-x)/60/60/1000).toFixed(2)), [head, last]),
    map(Date.parse),
    pluck('now')
  )
})

const summary = mapObjIndexed(spec)

const average = converge(divide, [sum, length])

const EPSILON = 1e-10
const stats = compose(
  x => console.log('||'+join('||', x)+'||'),
  map(sum),
  tap(x => x[x.length-1] = [average(x[x.length-1]).toFixed(2)]),
  transpose,
  map(values),
  tap(map(x => console.log('|'+join('|', values(x))+'|'))),
  tap(x => console.log('||'+join('||', keys(head(x)))+'||')),
  map(tap(x => x['эффективность'] = parseFloat((x["обработано в часах"]/(x["рабочее время"]+EPSILON)).toFixed(2)))),
  values,
  summary,
  aggregateByDate,
  sortBy(compose(d.parse, prop('now'))),
  reject(x => x['duration'] > 20),
)


const out = fs.createWriteStream(tap(console.error, `${DIR}total.csv`), {encoding: 'utf8'})
const parseCsv = csvPath =>
  fs.createReadStream(tap(console.error,`${DIR}${csvPath}`))
    .pipe(new csv.Parser(csvOptions))
    .pipe(pathTransformer(path.dirname(`${DIR}${csvPath}`) + '/'))
    .pipe(transformer())
    .pipe(new csv.Encoder(csvOptions))


const processValidatedCSVFromFolder = pipe(
  fsReaddirRecursive,
  filter(test(/\.csv$/)),
  reject(test(/total/)),
  map(parseCsv),
  x => mergeStream(x).pipe(out)
)

out.on('finish', () => stats(total))

processValidatedCSVFromFolder(DIR)
