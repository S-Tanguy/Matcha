var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
var bcrypt = require('bcrypt');
var request = require('request');
var uniqid = require('uniqid');
const nodemailer = require('nodemailer');

var url = 'mongodb://localhost:27017/db_matcha';

/* GET home page. */
router.get('/', function(req, res, next) {
	if (req.session.user){
		res.redirect('http://localhost:3000/home');
	}
	let error = req.session.error;
	req.session.error = undefined;
    res.render('index', {
	  login: req.session.user,
	  error: error
	});
});

router.get('/forget_password', function(req, res, next){
  res.render('forget_password');
});

router.get('/reset_password', function(req, res, next){
	mongo.connect(url, async function(err, db) {
		var exist = await db.collection('users').find({email: req.query.email, cle: req.query.cle}).count();
		if (!exist)
		{
			console.log(req.query.cle + '\n');
			console.log(req.query.email + '\n')
			console.log("LA CLE N'EST PAS VALIDE AVEC L'EMAIL");
			res.redirect('/');
		}
		else {
			res.render('reset_password', {email_hidden: req.query.email});
		}
	});
});

const getLoc = function() {
	return new Promise(function(res, rej) {
		request('http://freegeoip.net/json/', function(error, response, body) {
			if (error) { rej(error) }
			result = JSON.parse(body);
			let json = {}
			json.longitude = result.longitude;
			json.latitude = result.latitude;
			// console.log(longitude + "IN");
			res(json);
		});
	})
}

function dateDiff(dateold, datenew)
{
  var ynew = datenew.getFullYear();
  var mnew = datenew.getMonth();
  var dnew = datenew.getDate();
  var yold = dateold.getFullYear();
  var mold = dateold.getMonth();
  var dold = dateold.getDate();
  var diff = datenew - dateold;
  if(mold > mnew) diff--;
  else
  {
    if(mold == mnew)
    {
      if(dold > dnew) diff--;
    }
  }
  return diff;
}

const Age = function(birthday) {
	return new Promise(function(res, rej) {
		birthday = new Date(birthday);
  		res(new Number((new Date().getTime() - birthday.getTime()) / 31536000000).toFixed(0));
	})
}

router.post('/forget_password', function(req, res, next){
	console.log(req.body.email);
	console.log('//////////////////////////////////////');
	mongo.connect(url, async function(err, db) {
		var exist = await db.collection('users').find({email: req.body.email}).count();
		if (exist != 0){
			console.log('L\'EMAIL EXIST');
			var cle = uniqid();
			await db.collection('users').updateOne({email: req.body.email}, { $set: { cle: cle } });
			let transporter = nodemailer.createTransport({
    		service: 'gmail',
    		auth: {
					user: 'matcha42424242@gmail.com',
					pass: 'matcha42'
				}
			});
			let mailOptions = {
        from: 'matcha42424242@gmail.com', // sender address
        to: req.body.email, // list of receivers
        subject: 'Change password ✔', // Subject line
        text: 'Please check this page for reset your password ! http://localhost:3000/reset_password?cle=' + cle + '&email=' +  req.body.email + '',
    	};
			transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        } else {
        console.log('Message sent: %s', info.response);
			}
			});
		}
		else {
			console.log('L\'EMAIL N\'EXIST PAS');
		}
	});
});


router.post('/reset_password', function(req, res, next){
	if (req.body.password_one == req.body.password_two && validPassword(req.body.password_one)) {
		mongo.connect(url, async function(err, db) {
			bcrypt.hash(req.body.password_one, 5, async function(err, bcryptedPassword) {
				db.collection('users').updateOne({email: req.body.email_hidden}, { $set: { password: bcryptedPassword } }, async function(err, result){
					if (result){
						console.log('OK BITE')
					}
					await db.collection('users').updateOne({email: req.body.email_hidden}, { $unset: { cle: '' } });
				});
			});
			console.log("MDP IDENTIQUES");
		});
	}
	else {
		console.log("PROBLEME AVEC LES MOTS DE PASSE SOIT ILS SONT DIFFERENTS SOIT PAS AU BON FORMAT");
	}
});


function validEmail(email) {
    let regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
}

function validPassword(pwd) {
    let regex = /^\S*(?=\S{6,})(?=\S*[a-z])(?=\S*[A-Z])(?=\S*[\d])\S*$/;
    return regex.test(pwd);
}

function validLogin(login) {
    let regex = /^[a-z0-9]+$/i;
    return regex.test(login);
}

const ifexist = function(loginn, emaill) {
	return new Promise(function(res, rej) {
			mongo.connect(url, async function(err, db) {
			var exist_login = await db.collection('users').find({login: loginn}).count();
			var exist_email = await db.collection('users').find({email: emaill}).count();
			if (exist_login == 0 && exist_email == 0){
				console.log('JE SUIS DANS TRUE')
				res({toto: 'true'});
			}
			else {
				console.log('JE SUIS DANS FALSE')
				res({toto: 'false'});
			}
		});
	});
}

router.post('/testajax', async function(req, res, next) {
	var toto = await ifexist(req.body.login, req.body.email)
	if (validEmail(req.body.email) && validPassword(req.body.password) && validLogin(req.body.login)){
		if (req.body.nom && req.body.prenom && req.body.login && req.body.email && req.body.password && req.body.password_conf
			&& req.body.orientation && req.body.sex && req.body.date && (req.body.password == req.body.password_conf))
		{
			if (Age(req.body.date) >= '18' && toto.toto == 'true'){
				mongo.connect(url, async function(err, db) {
					if (await db.collection('users').find().count() == 0) {
						db.collection('users').createIndex( { loc : "2dsphere" } )
						console.log('FDP');
					}
					assert.equal(null, err);
					bcrypt.hash(req.body.password, 5, async function(err, bcryptedPassword) {
						if (err) {
							console.log("Pb avec le bcrypt");
						}
						var user = {
							nom: req.body.nom,
							prenom: req.body.prenom,
							login: req.body.login,
							email: req.body.email,
							sex: req.body.sex,
							orientation: req.body.orientation,
							age: await Age(new Date(req.body.date)),
							password: bcryptedPassword,
							accept: req.body.accept,
							like: [],
							liker: [],
							score: 200,
							photos: [],
							picture_profil: null

							//interets: null,
							//bio: null
						};
						if (req.body.accept == 0){
							let coord = await getLoc();
							var loc = {
								type: "Point",
								coordinates: [coord.longitude, coord.latitude]
							}
							console.log(coord);
							user.loc = loc;
							user.longitude = coord.longitude;
							user.latitude = coord.latitude;
							await db.collection('users').insertOne(user, function(err, result) {
								assert.equal(null, err);
								console.log("User add in db");
								res.redirect('/');
							});
						}
						else {
							var loc = {
								type: "Point",
								coordinates: [req.body.longitude, req.body.latitude]
							}
							user.loc = loc;
							user.longitude = req.body.longitude;
							user.latitude = req.body.latitude;
							await db.collection('users').insertOne(user, function(err, result) {
								assert.equal(null, err);
								console.log("User add in db");
								res.redirect('/');
							});
							db.close();
						}
					});
				});
				//res.redirect('/');
		}
		else {
			console.log("Problem, you're not an adult");
			res.redirect('/');
		}
		}
	}
	else {
		console.log("Problem with the format of password, email, or login")
		res.redirect('/');
	}
		//res.redirect('/');

});

router.post('/connexion', function(req, res, next) {
	if (req.body.login_log && req.body.password_log)
	{
		mongo.connect(url, function(err, db) {
			assert.equal(null, err);
			db.collection('users').findOne({login: req.body.login_log}, function(err, user) {
				if (err) {
					console.log('Username fail, no user find');
				}
				else if (user) {
					bcrypt.compare(req.body.password_log, user.password, function(err, findOne) {
						if (err){
							console.log('Probleme avec le bcrypt compare');
						}
    					if (findOne){
							req.session.connect = true;
							req.session.orientation = user.orientation;
							req.session.sex = user.sex;
							req.session.user = req.body.login_log;
							req.session.longitude = user.loc.coordinates[0];
							req.session.latitude = user.loc.coordinates[1];
							res.redirect('/home');
						}
						else {
							console.log("Bad password");
							req.session.connect = false;
							req.session.error = "Bad password";
							res.redirect('/');
						}
					});
				}
				else {
					console.log("User not find")
					req.session.connect = false;
					req.session.error = "We can't find you";
					res.redirect('/');
				}
				db.close();
			});
		});
	}
});

function deleteNotifs(login){
	mongo.connect(url, function(err, db) {
		db.collection('users').updateOne({login: login}, { $set: { notifications: [] } }, async function(err, isgood){
			if (isgood){
				console.log('effacement des notifs passee good');
			}
		});
	});
}

router.post('/kill_interets', async function(req, res, next){
	mongo.connect(url, function(err, db) {
		db.collection('users').updateOne({login: req.session.user}, { $pull: { interets: req.body.interets } }, async function(err, isdelete){
			if (isdelete){
				console.log('effacement d\'un interets good');
			}
		});
	});
	res.redirect('/home/profil');
})

router.post('/kill_photo', async function(req, res, next){
	mongo.connect(url, function(err, db) {
		db.collection('users').updateOne({login: req.session.user}, { $pull: { photos: req.body.photo } }, async function(err, isdelete){
			if (isdelete){
				console.log('effacement de la photo good');
			}
		});
	});
	res.redirect('/home/profil');
})

router.post('/deconnexion', async function(req, res, next) {
	await deleteNotifs(req.session.user)
	if (req.session) {
	    // delete session object
	    req.session.destroy(function(err) {
		  if (err) {
		    console.log("Probleme de destruction de session");
		  } else {
		    res.render('index', {
				login: undefined,
				message: "Byebye !"
			});
		  }
	    });
	}
})

module.exports = router;
