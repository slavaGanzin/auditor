#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
var {EOL} = require("os");
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
const chardet = require('chardet')
const iconv = require('iconv-lite')

let R = require('ramda')
for (let k in R)
  global[k] = R[k]

const start = (dataFolder, staticPath = 'static') => {
  const validatedFolder = path.resolve(`${dataFolder}/../validated/`)

  console.log(staticPath)
  const app = express()
  app.use(morgan('combined'))
  app.use('/data', serveStatic(dataFolder, {cacheControl: false}))
  app.use('/data', serveStatic(validatedFolder, {cacheControl: false}))
  app.use(serveStatic(staticPath, {cacheControl: false}))

  const outWav = `${dataFolder}/recorder.wav`

  mkdirp(validatedFolder)

  const validatedCsv =
    fs.createWriteStream(`${validatedFolder}/validated.csv`, {'flags': 'a'})

  const getNewFiles = () =>
    map(x => `${dataFolder}/${x}`, fsReaddirRecursive(dataFolder))

  let files = []
  const readFiles = (cb = identity) => {
    async.mapLimit(filter(test(/txt|wav$/), getNewFiles()), 100, (file, cb) => {
      if (file.match(/txt$/)) {
        chardet.detectFile(file, (e, encoding) => {
          encoding = defaultTo('utf8', encoding)
          fs.readFile(file, (e, text) => {
            text = iconv.decode(text, encoding)
            const txt = file.replace(dataFolder, 'data')
            const audio = txt.replace(/[^.]+$/, 'wav')
            if (!e) return cb(null, [text, audio, txt])
            console.error(e.message)
            cb()
          })
        })
      } else {
        const txt = file.replace(/wav$/, 'txt')
        fs.stat(txt, (e) => {
          if (!e) return cb()
          cb(null, ['', file.replace(dataFolder, 'data'), ''])
        })

      }
    }, (e, results) => cb(null, files = reject(isNil, results)))
  }

  const server = require('http').createServer(app)
  const io = socketIo(server)
  io
    .on('connection', ws => {
      readFiles(() => ws.emit('files', files))

      E.on('update:audio', () => ws.emit('update:audio', {}))

      ws.on('grade', ({text, quality, audio, textFile}) => {
        let validated = audio.replace('data', validatedFolder).replace('recorder', 'recorded/'+(new Date).getTime())
        const original = audio.replace('data', dataFolder)
        mkdirp(path.dirname(validated))
        fs.copyFile(original, validated, e => {
          if (e) return console.error(e)
          fs.unlink(original, identity)
          fs.unlink(textFile.replace('data', dataFolder), identity)
        })

        validatedCsv.write(`"${text.replace('"', "'")}",${validated.replace(validatedFolder+'/','')},${quality},"${new Date()}"${EOL}`)
      })
    })

  const binaryServer = binaryjs.BinaryServer({port: 9001})
  binaryServer.on('connection', (client) => {
    client.on('stream', (stream, meta) => {
      const fileWriter = new wav.FileWriter(outWav, {
        channels: 1,
        sampleRate: 48000,
        bitDepth: 16
      })
      stream.pipe(fileWriter)

      stream.on('end', () => {
        fileWriter.end()
        E.emit('update:audio', {})
      })
    })
  })

  server.listen(65533)
}

if (process.argv[2])
  start(process.argv[2])

module.exports = start
