#!/usr/bin/env node-dev

const fs = require('fs')
const {exec} = require('child_process')

exec('pug --watch static --name-after-file --pretty --no-debug')

require('auto-require')({
  globaly: true,
  toRoot: ['ramda']
})
const NEW = 'data/new/'
const FILES = 'data/files.csv'

let transcription2mp3 = []
const readFiles = () => {
  transcription2mp3 = map(split(',\t'), split('\n', fs.readFileSync(FILES, 'utf8')))
}
readFiles()

const files = map(x => `${NEW}${x}`, fsReaddirRecursive(NEW))

const outCsv = fs.createWriteStream(FILES, {'flags': 'a'})
const processFile = (file, cb) => {
  const mp3 = file.replace(/[^.]+$/, 'mp3')
  const txt = file.replace(/[^.]+$/, 'txt')
  fs.access(txt, fs.constants.F_OK, e => {
    if (e) return console.error(e)
    exec(`sox ${file} ${mp3}; rm ${file}`, () =>
      fs.readFile(txt, 'utf8', (e, transcription) => {
        outCsv.write(`${transcription},\t${mp3.replace('data/', '')}\n`)
        cb()
      })
    )
  })
}
const mp3queue = async.queue(processFile, 10)
mp3queue.drain = readFiles
map(mp3queue.push, reject(test(/mp3$|txt$/), files))

const app = express()
app.use(morgan('combined'))
app.use('/data', serveStatic('data', {cacheControl: false}))
app.use(serveStatic('static', {cacheControl: false}))
app.get('/files', (req, res, next) => {
  res.json(transcription2mp3)
})

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
      // ws.buffer.push([event, data])
      return data
    })

    const on = (message, f) =>
      ws.events[message] = concat(defaultTo([pp], ws.events[message]), [f])
  })
