#!/usr/bin/env node-dev

const fs = require('fs')
const {spawn} = require('child_process')

spawn('pug', '--watch static --name-after-file --pretty --no-debug'.split(' '))

require('auto-require')({
  globaly: true,
  toRoot: ['ramda']
})

app = express()

app.use(morgan('combined'))
app.use(serveStatic('static', {cacheControl: false}))

app.listen(3000)
