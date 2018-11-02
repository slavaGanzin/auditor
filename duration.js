#!/usr/bin/env node
for (let k in require('ramda'))
  global[k] = require('ramda')[k]
const fs = require('fs')
const path = require('path')
const fsReaddirRecursive = require('fs-readdir-recursive')
const csv = require('oh-csv')
const d = require('date-fns')
const Transform = require('stream').Transform
const cp = mapObjIndexed(require('util').promisify, require('child_process'))

const csvOptions = {
  fields: ['text', 'validated', 'quality', 'now', 'duration']
}
const DIR = path.resolve(process.argv[2]) + '/'

const parser = new csv.Parser(csvOptions)
const encoder = new csv.Encoder(csvOptions)

const getDuration = x =>
  cp.exec(`soxi -D "${x}"`, {encoding: 'utf8'})
    .then(({stdout, stderr}) => parseFloat(stdout))
    .catch(() => 0)

let total = []
const addToTotal = tap(total.push.bind(total))

const transformer = new Transform({
  objectMode: true,
  transform(row, encoding, cb) {

    if (row.duration)
      return cb(null, addToTotal(row))

    getDuration(DIR+row.validated)
      .then(duration => {
        cb(null, addToTotal(merge(row, {duration})))
      })
  }
})

const pathTransformer = p => new Transform({
  objectMode: true,
  transform(row, encoding, cb) {
    cb(null, merge(row, {validated: path.relative(DIR, p + '/' + row.validated)}))
  }
})

encoder.pipe(process.stdout)

const parseCsv = csvPath =>
  fs.createReadStream(`${DIR}${csvPath}`)
    .pipe(parser)
    .pipe(pathTransformer(path.dirname(`${DIR}${csvPath}`) + '/'))
    .pipe(transformer)
    .pipe(encoder)
    .pipe(fs.createWriteStream(`${DIR}total.csv`))

const processValidatedCSVFromFolder = pipe(
  fsReaddirRecursive,
  filter(test(/\.csv$/)),
  reject(test(/total/)),
  map(parseCsv)
)

processValidatedCSVFromFolder(DIR)

const aggregateByDate = groupBy(x => d.format(d.parse(Date.parse(x.now)), 'DD MMMM YY'))
const summary = mapObjIndexed(applySpec({
  total: length,
  duration: compose(sum, pluck('duration'))
}))

const stats = compose(
  console.log,
  x => JSON.stringify(x, null, ' '),
  summary,
  aggregateByDate
)

transformer.on('end', () => stats(total))
