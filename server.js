var http    = require('http'),
    fs      = require('fs'),
    express = require('express'),
    app     = express(),
    server  = http.createServer(app),
    io      = require('socket.io').listen(server),
    path    = require('path')
    config  = require('properties-reader');

var spawn   = require('child_process').spawn;
var prop    = config('app.properties');

// server the browser dependencies
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'node_modules')));

// open a route for each file from the command line
app.get('/files/:filename', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

server.listen(prop.get('server.port'), function () {
  console.log('Server running at http://0.0.0.0:'+ prop.get('server.port') +'/, connect with a browser to see tail output');
});

// websockets
io.on('connection', function(socket){
  
  console.log('[' + socket.id + ']-client connected.');
  var filepath = '';
  var tail;
  socket.on('path', function(data){
    filepath = data;
    if(tail) {
       console.log('kill spawn [' + tail.pid + ']');
       tail.kill(signal='SIGTERM');
    }
    tail = spawn("tail", ["-n15000", "-f", filepath]);
    socket.emit('message',{receive: 'receive filepath', socketId: socket.id});
  });

  //querylog
  socket.on('querylog', function(data) {
    socket.emit('message', {filename: filepath});

    tail.stdout.on("data", function (data) {
        console.log(data.toString('utf-8'))
        socket.emit('message', {log: data.toString('utf-8')}); 
    });
    // 当子进程退出时，检查是否有错误，同时关闭文件流
    tail.on('exit', function(code) {
      if (code != 0) {
        console.log('Failed: ' + code);
      }
    });
  });

  // disconnect
  socket.on('disconnect', function() {
    if(tail){
       console.log('disconnect [' + tail.pid + ']');
       console.log('disconnect kill spawn [' + tail.pid + ']');
       tail.kill(signal='SIGTERM');
    }
  });
});


