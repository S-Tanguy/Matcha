var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var index = require('./routes/index');
var users = require('./routes/users');
var home = require('./routes/home');

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//////////////////////////////// MIDDLEWEAR
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'fluteabec',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))


app.use('/', index);
app.use('/home', home);
app.use('/users', users);


nicknames = [];
//POUR LE CHAT
io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('chat message', function(msg){
	  	io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
    console.log('message: ' + msg);
  });

  socket.on('new user', function(data, callback){
    if(nicknames.indexOf(data) != -1){
        callback(false);
    }
    else {
      callback(true);
      socket.nickname = data;
      nicknames.push(socket.nickname);
      updateNicknames();
    }
  });

  function updateNicknames(){
    io.sockets.emit('usernames', nicknames);
  }

  socket.on('disconnect', function(){
    console.log('user disconnected');
    if (!socket.nickname) return;
    nicknames.splice(nicknames.indexOf(socket.nickname), 1);
    updateNicknames();
  });
});









http.listen(3003, function(){
  console.log('listening on *:3003');
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
