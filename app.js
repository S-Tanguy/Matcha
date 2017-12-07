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


users = {};
//POUR LE CHAT
io.on('connection', function(socket){

  console.log('a user connected');

  socket.on('chat message', function(data, callback){
	  var msg = data.trim();
	  if (msg.substr(0, 3) === '/w '){
		  msg = msg.substr(3);
		  var ind = msg.indexOf(' ');

		  if (ind !== -1)
		  {
			  var name = msg.substring(0, ind);
			  var msg = msg.substring(ind + 1);
			  if (name in users){
				  users[name].emit('whisper', {msg: msg, nick: socket.nickname});
				  console.log('Whisper!');
			  }
			  else {
				  callback('Error ! Enter a valide User');
			  }
	  	  }
		  else {
			  callback('Error! please enter a message for your whisper!');
	  	  }
	  } else {
	  	io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
    console.log('message: ' + msg);
		}
  });

  socket.on('new user', function(data, callback){
    if(data in users){
        callback(false);
    }
    else {
      callback(true);
      socket.nickname = data;
	  users[socket.nickname] = socket;
      updateNicknames();
    }
  });

  function updateNicknames(){
    io.sockets.emit('usernames', Object.keys(users));
  }

  socket.on('disconnect', function(){
	nicknames = "";
    console.log('user disconnected');
    if (!socket.nickname) return;
	delete users[socket.nickname];
	if (nicknames)
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
