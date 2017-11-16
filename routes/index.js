var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
var bcrypt = require('bcrypt');

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

router.post('/register', function(req, res, next) {
	if (req.body.nom && req.body.prenom && req.body.login && req.body.email && req.body.password && req.body.password_conf && (req.body.password == req.body.password_conf))
	{

		mongo.connect(url, function(err, db) {
			assert.equal(null, err);
			bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
				if (err) {
					console.log("Pb avec le bcrypt");
				}
				var user = {
					nom: req.body.nom,
					prenom: req.body.prenom,
					login: req.body.prenom,
					email: req.body.email,
					password: bcryptedPassword
				};
				db.collection('users').insertOne(user, function(err, result) {
					assert.equal(null, err);
					console.log("User add in db");
					db.close();
				});
			});
		});
	}
	res.redirect('/');
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
							req.session.user = req.body.login_log;
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
