var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
var bcrypt = require('bcrypt');
var request = require('request');

var url = 'mongodb://localhost:27017/db_matcha';

/* GET home page. */
router.get('/', function(req, res, next) {
	let error = req.session.error;
	req.session.error = undefined;
    res.render('index', {
	  login: req.session.user,
	  error: error
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

router.post('/testajax', function(req, res, next) {
	if (req.body.nom && req.body.prenom && req.body.login && req.body.email && req.body.password && req.body.password_conf
		&& req.body.orientation && req.body.sex && req.body.date && (req.body.password == req.body.password_conf))
	{
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
					score: 200

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

router.post('/deconnexion', function(req, res, next) {
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
