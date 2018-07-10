window.ws = {}

function WebSocketConnect (events = {}, buffer = [], debug = false) {
  ws = new WebSocket('ws://0.0.0.0:3001')

  ws.events = events
  ws.buffer = buffer
  ws.debug = debug

  ws.log = [(...args) => ws.debug && pp(...args)]

  ws.on = (message, f) => {
    ws.events[message] = (ws.events[message] || ws.log).concat([f])
    return ws
  }

  ws.onmessage = message => {
    const data = JSON.parse(message.data)
    const event = Object.keys(data)[0]

    for (let f of ws.events[event] || ws.log)
      f(data[event])
  }

  ws.emit = (event, data) => {
    ws.log[0](event, data)

    const mp = JSON.stringify({[event]: data})

    if (ws.readyState == ws.OPEN)
      ws.send(mp)
    else
      ws.buffer.push(mp)

    return ws
  }

  ws.onopen = message => {
    while (message = ws.buffer.pop())
      ws.send(message)

    console.log('connected')
  }

  ws.onclose = () =>
    setTimeout(() => WebSocketConnect(clone(ws.events), clone(ws.buffer), clone(ws.debug)), 1000)
}

WebSocketConnect()
