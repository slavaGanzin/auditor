#!/usr/bin/env node-dev

const fs = require('fs')
const {exec, execSync} = require('child_process')

require('auto-require')({
  globaly: true,
  toRoot: ['ramda']
})

function pp (...args) {
  for (let x of args)
    process.stdout.write(JSON.stringify(x, null, ' ') + '\n')
  return args
}

const NEW = 'data/new/'
const NEW_CSV = 'data/new.csv'
const VALIDATED_CSV = 'data/validated.csv'

let files = []
const readFiles = () => {
  files = map(split(',\t'), split('\n', fs.readFileSync(NEW_CSV, 'utf8')))
}
readFiles()

const newFiles = map(x => `${NEW}${x}`, fsReaddirRecursive(NEW))
const newCsv = fs.createWriteStream(NEW_CSV, {'flags': 'a'})
const validatedCsv = fs.createWriteStream(VALIDATED_CSV, {'flags': 'a'})

const processFile = (file, cb) => {
  const mp3 = file.replace(/[^.]+$/, 'mp3')
  const txt = file.replace(/[^.]+$/, 'txt')
  fs.access(txt, fs.constants.F_OK, e => {
    if (e) return console.error(e)
    exec(`sox ${file} ${mp3}; rm ${file}`, () =>
      fs.readFile(txt, 'utf8', (e, transcription) => {
        newCsv.write(`${transcription},\t${mp3.replace('data/', '')}\n`)
        cb()
      })
    )
  })
}
const mp3queue = async.queue(processFile, 10)
mp3queue.drain = readFiles
map(mp3queue.push, reject(test(/mp3$|txt$/), newFiles))

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
      // ws.buffer.push([event, data])
      return data
    })

    const on = (message, f) =>
      ws.events[message] = concat(defaultTo([pp], ws.events[message]), [f])

    emit('files', files)
    on('grade', ({text, quality, audio}) => {
      const validatedAudio = audio.replace('new', 'validated')

      execSync(`sh -c "mkdir -p \`dirname ${validatedAudio}\` && mv ${audio} ${validatedAudio}"`)

      validatedCsv.write(`"${text.replace('"', "'")}",${validatedAudio},${quality}\n`)
    })
  })
