var express = require('express');
var router = express.Router();
var mongo = require('mongodb');

var url = 'mongodb://localhost:27017/db_matcha';

/* GET users listing. */
router.get('/', function(req, res, next) {
  if (req.session.user){
    res.send('respond with a resource');
  }
  else {
    res.redirect('/');
  }
});

router.get('/:login', function(req, res, next) {
  if (req.session.user){
  	mongo.connect(url, function(err, db) {
  		db.collection('users').findOne({login: req.params.login}, async function(error, Userfound) {
        await db.collection('users').findOne({login: req.session.user, blok_users: [req.params.login]}, async function (error, result){
          if (result){
      			if (err){
      				console.log("Pb with the search of the profil");
      			}
      			else {
      			res.render('showprofil', {user: Userfound, blok_user: true});
      			}
          }
          else {
            await db.collection('users').findOne({login: req.session.user, like: [req.params.login]}, async function (err, is_in_like){
              if (is_in_like)
                res.render('showprofil', {user: Userfound, blok_user: false, is_like: true})
              else
                res.render('showprofil', {user: Userfound, blok_user: false, is_like: false})
            });
          }
        });
  		});
  	});
  }
  else {
    res.redirect('/');
  }
});

router.post('/like', function(req, res, next) {
	mongo.connect(url, async function(err, db){
		await db.collection('users').update(
   			{ login: req.session.user },
   				{ $addToSet: { like: req.body.user} }
			);
    await db.collection('users').update({
      login: req.body.user, liker: { $nin: [req.session.user]}
      }, {
      $inc: { score: +3 }
      }
		);
		console.log(req.session.user);
		console.log(req.body.user);
		await db.collection('users').update(
			{ login: req.body.user },
				{ $addToSet: { liker: req.session.user} }
		);
			console.log(req.session.user);
			console.log(req.body.user);
	});
});

router.post('/dislike', function(req, res, next) {
	mongo.connect(url, async function(err, db){
		await db.collection('users').update(
   			{ login: req.session.user },
   				{ $pull: { like: req.body.user} }
			);
      await db.collection('users').update({
        login: req.body.user, liker: { $in: [req.session.user]}
        }, {
        $inc: { score: -3 }
        }
  		);
      await db.collection('users').update(
  			{ login: req.body.user },
  				{ $pull: { liker: req.session.user} }
  		);
	});
});

router.post('/blok', function(req, res, next){
  console.log('bite');
  mongo.connect(url, async function(err, db){
    await db.collection('users').findOne({login: req.body.user, bloker_users_history: [req.session.user]}, async function (error, result){
        await db.collection('users').update({
          login: req.session.user
          }, {
            $addToSet: {
              blok_users: req.body.user
            }
          }
        );
        await db.collection('users').update({
          login: req.body.user
        }, {
          $addToSet: {
            bloker_users_history: req.session.user
          }
        }
      );
      await db.collection('users').update({
        login: req.body.user
      }, {
        $addToSet: {
          bloker_users: req.session.user
        }
      }
    );
      if (!result)
      {
      await db.collection('users').update({
        login: req.body.user
        }, {
          $inc: {
            score: -5
          }
        }
      );
      }
    });
  });
});

router.post('/unblok', function(req, res, next){
  console.log('bite');
  mongo.connect(url, async function(err, db){
    await db.collection('users').update({
      login: req.session.user
      }, {
      $pull: { blok_users: req.body.user}
      }
    );
    await db.collection('users').update({
      login: req.body.user
      }, {
      $pull: { bloker_users: req.session.user}
      }
    );
  });
});

router.post('/add_view_profil', function(req, res, next) {
  if (req.body.user != req.session.user ) {
  	mongo.connect(url, async function(err, db){
  		console.log("JE SUIS DANS ADD VIEW PROFIL");
      await db.collection('users').update({
        login: req.body.user, viewer_profil: { $nin: [req.session.user]}
        }, {
        $inc: { score: +1 }
        }
  		);
       await db.collection('users').update(
  		 	{ login: req.body.user },
  		 		{ $addToSet: { viewer_profil: req.session.user } }
  		 );
  	});
  }
});

module.exports = router;
