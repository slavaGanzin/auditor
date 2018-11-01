#!/usr/bin/env node
const fs = require('fs')
const cp = require('child_process')
const path = require('path')
const fsReaddirRecursive = require('fs-readdir-recursive')
const csv = require('oh-csv')
const encoder = new csv.Parser({
  fields: ['text', 'validated', 'quality', 'now']
})

for (let k in require('ramda'))
  global[k] = require('ramda')[k]

let errors =0
let total = 0

const parseDuration = compose(
  parseFloat,
  replace(/"/g,''),
  pathOr("0", ['streams_stream_0_duration']),
  fromPairs,
  map(split('=')),
  split('\n')
)

const getDuration = x => new Promise((resolve, reject) =>
  cp.exec(`ffprobe -v error -of flat=s=_ -select_streams a:0 -show_streams "${x}"`, {encoding: 'utf8'}, (e, stdout, stderr) => {
    total++
    // console.log(e)
    if (!e) return resolve(parseDuration(stdout))
    errors++
    resolve(0)
  }))

const getDurationsOfOneFile = ([d, csv]) => pipe(
  split('\n'),
  filter(test(new RegExp(process.argv[3]))),
  map(replace(/,[^,]+validated([^,]+)/, `,/$1`)),
  map(replace(/.*,([^,]*mp3).*/g, `${d}/$1`)),
  map(replace(/\r/g, ``)),
  map(replace(/\/\//g, `/`)),
  tap(x => console.log(`total: ${length(x)}`)),
  map(getDuration),
)(csv)

const validatedCSVFromFolder = pipe(
  fsReaddirRecursive,
  filter(test(/\.csv$/)),
  map(x => [
    path.dirname(`${process.argv[2]}/${x}`),
    fs.readFileSync(`${process.argv[2]}/${x}`, 'utf8')
  ])
)

Promise.all(flatten(map(getDurationsOfOneFile, validatedCSVFromFolder(process.argv[2]))))
  .then(flatten)
  .then(reject(x => x > 60))
  .then(sum)
  .then(divide(__, 60*60))
  .then(x => console.log(x + "\nerrors:\t", errors, "\ntotal:\t", total))
