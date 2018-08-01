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
const querystring = require("querystring")

let R = require('ramda')
for (let k in R)
  global[k] = R[k]

const start = (dataFolder, staticPath = 'static') => {
  const validatedFolder = path.resolve(`${dataFolder}/../validated/`)

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
    async.mapLimit(filter(test(/(wav|mp3)$/), getNewFiles()), 100, (file, cb) => {
      const txt = file.replace(/(wav|mp3)$/, 'txt')
      chardet.detectFile(txt, (e, encoding) => {
        fs.readFile(txt, (e, text) => {
          if (e) return cb(null, ['', file.replace(dataFolder, 'data'), ''])

          encoding = /utf/i.test(encoding) ? 'utf8' : 'win1251'

          text = iconv.decode(text, encoding).replace('\\n', ' ')

          return cb(null, [text, file.replace(dataFolder, 'data'), ''])
        })
      })
    }, (e, results) => cb(null, files = reject(isNil, results)))
  }

  const server = require('http').createServer(app)
  const io = socketIo(server)
  io
    .on('connection', ws => {
      readFiles(() => ws.emit('files', files))

      E.on('update:audio', () => ws.emit('update:audio', {}))

      ws.on('grade', ({text, quality, audio, textFile}) => {
        audio = querystring.unescape(audio)
        let validated = audio.replace('data', validatedFolder).replace('recorder', 'recorded/'+(new Date).getTime())
        const original = audio.replace('data', dataFolder)
        mkdirp(path.dirname(validated))
        fs.copyFile(original, validated, e => {
          if (e) return console.error(e)
          fs.unlink(original, identity)
          fs.unlink(textFile.replace('data', dataFolder), identity)
        })

        text = text.replace('"', "'").replace(/\n/g, '\\n')
        validated = validated.replace(validatedFolder+'/','')
        let now = (new Date()).toGMTString()

        validatedCsv.write(`"${text}",${validated},${quality},"${now}"${EOL}`)
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
