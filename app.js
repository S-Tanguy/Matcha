var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongo = require('mongodb');

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
app.use(express.static(path.join(__dirname, '/public')));
//app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
//app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/', express.static(__dirname + '/www')); // redirect root
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
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
var url = 'mongodb://localhost:27017/db_matcha';
//POUR LE CHAT
io.on('connection', function(socket){

  console.log('a user connected');

  socket.on('likeUser', async function(data){
    console.log(data.user_like);
    console.log(' ICIIIIIIIIIIIIIII');
    await mongo.connect(url, async function(err, db) {
			await db.collection('users').findOne({login: data.user_like, like: { $in: [data.like_autor]}}, async function(err, result){
        if (result){
          if (users[data.user_like])
          users[data.user_like].emit('someOneLikeYouInBack', data.like_autor);
        }else {
          if (users[data.user_like])
          users[data.user_like].emit('someOneLikeYou', data.like_autor);
        }
      });
			console.log('dialogue enregistré');
		});
  });


  socket.on('dislikeUser', async function(data){
    if (users[data.user_dislike]){
      users[data.user_dislike].emit('someOneDislikeYou', data.dislike_autor);
      await mongo.connect(url, async function(err, db) {
        html = `<br><div class=notifDislikeYou> <p> ${data.dislike_autor} dislike you </p> </div><br><hr>`
        await db.collection('users').updateOne({login: data.user_dislike}, {$push: {notifications: html}})
  		});
    }
  });

  socket.on('visitProfil', async function(data){
    await mongo.connect(url, async function(err, db) {
      html = `<br><div class=notifVisitYou> <p> ${data.visit_autor} visit your profil </p> </div><br><hr>`
      await db.collection('users').updateOne({login: data.user_profil}, {$push: {notifications: html}})
    });
    if (users[data.user_profil])
    users[data.user_profil].emit('someOneVisitYourProfil', data.visit_autor);
	});



  socket.on('chat message', async function(data, callback){
	  console.log(data.desti + "ICI");
	  console.log(data.msg);
	  //console.log(user[name]);
	  //if (name in users){
	  	var conv = [data.desti, socket.nickname];
		conv.sort();
		var conversation = "" + conv[0] + "_" + conv[1] + "";


    await mongo.connect(url, async function(err, db) {
			await db.collection('chat').update({conversation: conversation}, {$push: {messages: {autor: socket.nickname, msg: data.msg}}}, {upsert: true});
			console.log('dialogue enregistré');
      html = `<br><div class=notifSomeOneSendMessage> <p> ${socket.nickname} send you a new message </p> </div><br><hr>`
      await db.collection('users').updateOne({login: data.desti}, {$push: {notifications: html}})
		});
      if (users[data.desti]){
		      users[data.desti].emit('whisper', {msg: data.msg, nick: socket.nickname, div_chat: data.desti});
          users[data.desti].emit('notifNewMessage', socket.nickname);
      }


		  console.log('Whisper!');
	 // }
	 /* //var msg = data.trim();
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
}*/
  });

  socket.on('charge old messages', async function(data, callback){
	  var conv = [data.desti, data.autor];
	  conv.sort();
	  var conversation = "" + conv[0] + "_" + conv[1] + "";
	  await mongo.connect(url, async function(err, db) {
		  var elem = await db.collection('chat').find({conversation: conversation}).toArray();
		  socket.emit('append old messages', {elem: elem}, function(){
		  });
		});
  });



  socket.on('new user', async function(data, callback){
    if(data in users){
        callback(false);
    }
    else {
      callback(true);
      socket.nickname = data;
      await mongo.connect(url, async function(err, db) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();

        if(dd<10) {
          dd = '0'+dd
        }

        if(mm<10) {
          mm = '0'+mm
        }

        today = dd + '/' + mm + '/' + yyyy;
        await db.collection('users').updateOne({login: socket.nickname}, {$set: { last_connexion:  'online'} });
      });
	  users[socket.nickname] = socket;
      updateNicknames();
    }
  });

  function updateNicknames(){
    io.sockets.emit('usernames', Object.keys(users));
  }



  socket.on('disconnect', async function(){
	nicknames = "";
    console.log('user disconnected');
    if (!socket.nickname) return;
	delete users[socket.nickname];
  await mongo.connect(url, async function(err, db) {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    if(dd<10) {
      dd = '0'+dd
    }

    if(mm<10) {
      mm = '0'+mm
    }

    today = dd + '/' + mm + '/' + yyyy;
    await db.collection('users').updateOne({login: socket.nickname}, {$set: { last_connexion:  today} });
  });
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
  res.send('Page 404 desole cette page n\'existe pas');
});

module.exports = app;
