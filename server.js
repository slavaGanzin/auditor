#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const {exec} = require('child_process')
const {EventEmitter} = require('events')
const E = new EventEmitter()
const express = require('express')
const async = require('async')
const binaryjs = require('binaryjs')
const mkdirp = require('mkdirp')
const fsReaddirRecursive = require('fs-readdir-recursive')
const morgan = require('morgan')
const serveStatic = require('serve-static')
const socketIo = require('socket.io')
const wav = require('wav')

let R = require('ramda')
for (let k in R)
  global[k] = R[k]

const app = express()
app.use(morgan('combined'))
app.use('/data', serveStatic('data', {cacheControl: false}))
app.use(serveStatic('static', {cacheControl: false}))

function pp (...args) {
  for (let x of args)
    process.stdout.write(JSON.stringify(x, null, ' ') + '\n')
  return args
}

const outWav = './data/recorder.wav'

const validatedCsv =
  fs.createWriteStream('data/validated/validated.csv', {'flags': 'a'})

const getNewFiles = () =>
  map(x => `data/new/${x}`, fsReaddirRecursive('data/new'))

let files = []
const readFiles = (cb = identity) => {
  async.mapLimit(filter(test(/txt$/), getNewFiles()), 100, (txt, cb) => {
    fs.readFile(txt, 'utf8', (e, text) => {
      const mp3 = txt.replace(/[^.]+$/, 'mp3')
      if (!e) return cb(null, [text, mp3, txt])
      console.error(e.message)
      cb()
    })
  }, (e, results) => cb(null, files = reject(isNil, results)))
}

const any2mp3 = (file, cb) =>
  exec(`sox ${file} ${file.replace(/[^.]+$/, 'mp3')}; rm ${file}`, cb)
const mp3queue = async.queue(any2mp3, 10)
mp3queue.drain = readFiles

map(mp3queue.push, reject(test(/mp3$|txt$/), getNewFiles()))

const server = require('http').createServer(app)
const io = socketIo(server)
io
  .on('connection', ws => {
    readFiles(() => ws.emit('files', files))

    E.on('update:audio', () => ws.emit('update:audio', {}))

    ws.on('grade', ({text, quality, audio, validated, textFile}) => {
      mkdirp(path.dirname(validated))
      fs.copyFile(audio, validated, e => {
        fs.unlink(audio, identity)
        fs.unlink(textFile, identity)
      })

      validatedCsv.write(`"${text.replace('"', "'")}",${validated},${quality},${new Date()}\n`)
    })
  })

const binaryServer = binaryjs.BinaryServer({port: 9001})
binaryServer.on('connection', (client) => {
  console.log('new connection')
  client.on('stream', (stream, meta) => {
    console.log('new stream')
    const fileWriter = new wav.FileWriter(outWav, {
      channels: 1,
      sampleRate: 48000,
      bitDepth: 16
    })
    stream.pipe(fileWriter)

    stream.on('end', () => {
      fileWriter.end()
      any2mp3(outWav, () => E.emit('update:audio', 123))
    })
  })
})

server.listen(65533)
