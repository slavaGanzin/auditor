#!/usr/bin/env node
const path =  require('path')
const duration =  require('get-audio-duration')
const fs = require('fs')
const parse = require('csv-parse/lib/sync')

for (let k in require('ramda'))
  global[k] = require('ramda')[k]

const csv = parse(fs.readFileSync(process.argv[2]))
console.log(csv)


// const getDurations = folder => compose(
//   x => Promise.all(x),
//   map(duration),
//   map(x => path.resolve(folder, x)),
//   fsReaddirRecursive
// )(folder)
//
// getDurations(folder)
//   .then(sum)
//   .then(divide(__, 60 * 60))
//   .then(console.log)
