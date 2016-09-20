var pty = require('pty.js')
var terminals = {}
var logs = {}

exports.xtermGet = function (req, res) {
  res.render('xterm', {
    title: 'Xterm'
  })
}

exports.getTerminal = function (req, res) {
  var cols = parseInt(req.query.cols)
  var rows = parseInt(req.query.rows)
  var pid = parseInt(req.query.processID)

  if (isNaN(pid)) { // || !terminals[pid]
    var term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
      name: 'xterm-color',
      cols: cols || 120,
      rows: rows || 48,
      cwd: process.env.HOME,
      env: process.env
    })
    term.on('exit', function () {
      console.log('pty exited pid: ' + term.pid)
    })

    term.on('close', function () {
      console.log('pty closed pid: ' + term.pid)
    })
    console.log('Created terminal with PID: ' + term.pid)

    terminals[term.pid] = term
    logs[term.pid] = ''
    term.on('data', function (data) {
      logs[term.pid] += data
    })
  } else {
    term = terminals[pid]
    logs[term.pid] = ''
  }

  res.send(term.pid.toString())
  res.end()
}

exports.getTerminalSize = function(req, res) {
  var pid = parseInt(req.params.pid)
  var cols = parseInt(req.query.cols)
  var rows = parseInt(req.query.rows)
  var term = terminals[pid]
  term.resize(cols, rows)
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.')
  res.end()
}

exports.wsTerminal = function(ws, req) {
  var term = terminals[parseInt(req.params.pid)]
  console.log('Connected to terminal ' + term.pid)
  ws.send(logs[term.pid])

  term.on('close', function () {
    delete terminals[term.pid]
    delete logs[term.pid]
    ws.close()
  })

  term.on('data', function (data) {
    try {
      ws.send(data)
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  })
  ws.on('message', function (msg) {
    term.write(msg)
  })
}
