var express = require('express');
var router = express.Router();
var mongo = require('mongodb');

var url = 'mongodb://localhost:27017/db_matcha';

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/:login', function(req, res, next) {
	mongo.connect(url, function(err, db) {
		db.collection('users').findOne({login: req.params.login}, function(error, Userfound) {
			if (err){
				console.log("Pb with the search of the profil");
			}
			else {
			res.render('showprofil', {user: Userfound});
			}
		});
	});
});

router.post('/like', function(req, res, next) {
	mongo.connect(url, async function(err, db){
		await db.collection('users').update(
   			{ login: req.session.user },
   				{ $push: { like: req.body.user} }
			);
		console.log(req.session.user);
		console.log(req.body.user);
		await db.collection('users').update(
			{ login: req.body.user },
				{ $push: { liker: req.session.user} }
		);
			console.log(req.session.user);
			console.log(req.body.user);
	});
});

module.exports = router;
