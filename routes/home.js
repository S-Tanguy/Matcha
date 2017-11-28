var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
var multer = require('multer');

var url = 'mongodb://localhost:27017/db_matcha';


router.get('/', async function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/');
	} else {
		let db = await mongo.connect(url);
		let users = await db.collection('users').find({login: {$ne: 'toto'}});
		let array = [];
		users.forEach(function(doc, err) {
			array.push(doc);
		}, function() {
			res.render('home', { title: req.session.user, users: array, toto: "bite"});
		})
	}
});

router.get('/profil', function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/');
	} else {
		mongo.connect(url, function(err, db) {
			db.collection('users').findOne({login: req.session.user}, function(err, user) {
				if(err){
					console.log("Erreur lors du chargement du profil");
				}
				else if(!user){
					res.redirect('/');
				}
				else {
					res.render('profil', { login: user.login,
										email: user.email,
										nom: user.nom,
										prenom: user.prenom,
										sex: user.sex,
										orientation: user.orientation,
										bio: user.bio,
										interets: user.interets,
										photos: user.images
										});
				}
			});
		});
	}
});

var storage = multer.diskStorage({
						destination: function (req, file, cb) {
								cb(null, 'uploads/')
						},
						filename: function (req, file, cb) {
								cb(null, file.fieldname + '-' + Date.now() + '.jpg')
							}
});

var upload = multer({ storage: storage }).single('file');

router.post('/edit_profil', upload,function(req, res, next) {
	if (req.session.user) {
			mongo.connect(url, function(err, db){
				console.log('ici');
				console.log(req.session.user);
				if (req.body.nom != "" && req.body.nom  != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { nom: req.body.nom  }
				  });
				}
				if (req.body.prenom != "" && req.body.prenom != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { prenom: req.body.prenom }
				  });
				}
				if (req.body.email != "" && req.body.email != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { email: req.body.email }
				  });
				}
				if (req.body.sex != "" && req.body.sex != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { sex: req.body.sex }
				  });
				}
				if (req.body.orientation != "" && req.body.orientation != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { orientation: req.body.orientation }
				  });
				}
				if (req.body.bio != "" && req.body.bio != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { bio: req.body.bio }
				  });
				}
				if (req.body.interets != "" && req.body.interets != null)
				{
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { interets: req.body.interets }
				  });
				}
				if (req.body.photos != "")
				{
					upload(req, res, function (err) {
				    if (err) {
				      // An error occurred when uploading
				      return
				    }
						console.log('it\'s good');
				    // Everything went fine
				  });



					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $set: { photos: req.body.photos }
				  });
				}
			   /*db.collection('users').updateOne(
			      { login: req.session.user },
			      { $set: { sex: req.body.sex//,
					  /*orientation: req.bodyorientation,
					  bio: req.body.bio,
				   	interets: req.body.interets,
				images: req.body.images } }
			);*/
			//NE PAS OUBLIER LES IMAGES
			   db.close();
			});
	}
	res.redirect('/home/profil');
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
