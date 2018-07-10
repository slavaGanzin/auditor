#!/usr/bin/env node-dev

const fs = require('fs')
const {exec} = require('child_process')

exec('pug --watch static --name-after-file --pretty --no-debug')

require('auto-require')({
  globaly: true,
  toRoot: ['ramda']
})
const NEW = 'data/new/'

const files = map(x => `${NEW}${x}`, fsReaddirRecursive(NEW))

const outCsv = fs.createWriteStream('data/files.csv', {'flags': 'a'})
const processFile = (file, cb) => {
  const mp3 = file.replace(/[^.]+$/, 'mp3')
  const txt = file.replace(/[^.]+$/, 'txt')
  fs.access(txt, fs.constants.F_OK, e => {
    if (e) return console.error(e)
    exec(`sox ${file} ${mp3}; rm ${file}`, () =>
      fs.readFile(txt, 'utf8', (e, transcription) => {
        outCsv.write(`"${transcription}",${mp3}\n`)
        cb()
      })
    )
  })
}
const mp3queue = async.queue(processFile, 10)

mp3queue.drain = function() {
    console.log("All files are uploaded");
};

map(mp3queue.push, reject(test(/mp3$|txt$/), files))

const app = express()
app.use(morgan('combined'))
app.use(serveStatic('static', {cacheControl: false}))
app.listen(3000)
