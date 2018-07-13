#!/usr/bin/env node-dev

const fs = require('fs')
const path = require('path')
const {exec} = require('child_process')
const {EventEmitter} = require('events')
const E = new EventEmitter()

require('auto-require')({
  globaly: true,
  toRoot: ['ramda']
})

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
  async.map(filter(test(/txt$/), getNewFiles()), (txt, cb) => {
    fs.readFile(txt, 'utf8', (e, text) => {
      const mp3 = txt.replace(/[^.]+$/, 'mp3')
      if (!e) return cb(null, [text, mp3])
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

const app = express()
app.use(morgan('combined'))
app.use('/data', serveStatic('data', {cacheControl: false}))
app.use(serveStatic('static', {cacheControl: false}))
app.listen(3000)

const wss = new uws.Server({port: 3001})

wss
  .on('connection', ws => {
    ws.on('message', message => {
      try {
        const data = JSON.parse(message)
        const [event] = Object.keys(data)

        for (let f of ws.events[event] || [pp])
          f(data[event])
      } catch (e) {
        pp(e, message)
      }
    })

    ws.events = []
    ws.sentDocs = []

    const emit = curry((event, data) => {
      if (ws.readyState == ws.OPEN)
        return ws.send(JSON.stringify({[event]: data}))
      return data
    })

    const on = (message, f) =>
      ws.events[message] = concat(defaultTo([pp], ws.events[message]), [f])

    readFiles(() => emit('files', files))

    E.on('update:audio', () => emit('update:audio', {}))

    on('grade', ({text, quality, audio, validated}) => {
      mkdirp(path.dirname(validated))
      fs.copyFile(audio, validated, e => fs.unlink(audio, identity))

      validatedCsv.write(`"${text.replace('"', "'")}",${validated},${quality}\n`)
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
