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
        let signal = await db.collection('users').findOne({login: req.session.user, user_signal: { $in: [req.params.login]}});
        let mes_photos = await db.collection('users').findOne({login: req.session.user}, {picture_profil: 1});
        await db.collection('users').findOne({login: req.session.user, blok_users: { $in :[req.params.login]}}, async function (error, result){
          if (result){
      			if (err){
      				console.log("Pb with the search of the profil");
      			}
      			else {
              if (signal)
      			     res.render('showprofil', {user: Userfound, blok_user: true, me: req.session.user, signal: true});
              else
                 res.render('showprofil', {user: Userfound, blok_user: true, me: req.session.user, signal: false});
            }
          }
          else {
            await db.collection('users').findOne({login: req.session.user, like: { $in : [req.params.login]}}, async function (err, is_in_like){
              if (is_in_like){
                if (signal){
                  res.render('showprofil', {me: req.session.user, user: Userfound, blok_user: false, is_like: true, signal: true, mes_photos: mes_photos.picture_profil})
                }
                else {
                  res.render('showprofil', {me: req.session.user, user: Userfound, blok_user: false, is_like: true, signal: false, mes_photos: mes_photos.picture_profil})
                }
              }
              else{
                if (signal)
                  res.render('showprofil', {me: req.session.user, user: Userfound, blok_user: false, is_like: false, signal: true, mes_photos: mes_photos.picture_profil})
                else
                  res.render('showprofil', {me: req.session.user, user: Userfound, blok_user: false, is_like: false, signal: false, mes_photos: mes_photos.picture_profil})
              }
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
		await db.collection('users').findOne({login: req.body.user, like: { $in: [req.body.like_autor]}}, async function(err, result){
      if (result){
        html = `<br><div class=notifSomeOneLikeYouInBack> <p> ${req.body.like_autor} like you in back</p> </div><br><hr>`
        await db.collection('users').updateOne({login: req.body.user}, {$push: {notifications: html}})
      }else {
        html = `<br><div class=notifSomeOneLikeYou> <p> ${req.body.like_autor} like you </p> </div><br><hr>`
        await db.collection('users').updateOne({login: req.body.user}, {$push: {notifications: html}})
      }
    });
			console.log('dialogue enregistré');
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
      //html = `<br><div class=notifDislikeYou> <p> ${req.body.dislike_autor} dislike you </p> </div><br><hr>`
      //await db.collection('users').updateOne({login: req.body.user}, {$push: {notifications: html}})
	});
});

router.post('/signal_button', function(req, res, next) {
	mongo.connect(url, async function(err, db){
    await db.collection('users').findOne({login: req.session.user, user_signal: [req.body.user]}, async function (error, result){
      if (!result){
        await db.collection('users').update(
       			{ login: req.session.user },
       				{ $push: { user_signal: req.body.user} }
    			);
          await db.collection('users').update({
            login: req.body.user
            }, {
            $inc: { score: -2 }
            }
      		);
          console.log('L\'utilisateur a ete signale');
      }
    });
	});
});

router.post('/blok', function(req, res, next){
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
