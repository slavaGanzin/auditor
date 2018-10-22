#!/usr/bin/env node
const fs = require('fs')
const cp = require('child_process')

for (let k in require('ramda'))
  global[k] = require('ramda')[k]

const path =  require('path')

const csv = fs.readFileSync(process.argv[2], 'utf8')
const d = path.resolve(path.dirname(process.argv[2]))

const getDuration = compose(x=>parseFloat(pathOr("0", ['streams_stream_0_duration'], x).replace(/"/g,'')), fromPairs, map(split('=')), split('\n'))

let errors =0
let total = 0

pipe(
  split('\n'),
  map(replace(/.*,([^,]*mp3).*/g, `${d}/$1`)),
  map(x => new Promise((resolve, reject) =>
    cp.exec(`ffprobe -v error -of flat=s=_ -select_streams a:0 -show_streams "${x}"`, {encoding: 'utf8'}, (e, stdout, stderr) => {
      total++
      console.log(e)
      if (!e) return resolve(getDuration(stdout))
      errors++
      resolve(0)
    }))),
  x => Promise.all(x),
)(csv)
  .then(reject(gt(60)))
  .then(sum)
  .then(divide(__, 60*60))
  .then(x => console.log(x, "\nerrors:\t", errors, "\ntotal:\t", total))
