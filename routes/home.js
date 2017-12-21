var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
var _ = require('underscore');
var multer = require('multer');
var NodeGeocoder = require('node-geocoder');

var url = 'mongodb://localhost:27017/db_matcha';

var options = {
  provider: 'google',

  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: 'AIzaSyCYV5V1wefNwQQ_5ukp4SLtcqmrUh2Kp48', // for Mapquest, OpenCage, Google Premier
  formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

/*const getLongiLati = function(req, longi, lati) {
  return new Promise(function(res, rej) {
    if (longi == 'nothing' && lati == 'nothing')
      return ({longitude: req.session.longitude, latitude: req.session.latitude});
    else
      return ({longitude: longi, latitude: lati});
  })
}*/

getUsers = async (req, longi, lati) => {
  console.log(longi)
  console.log(lati)
  console.log('YEAHHH')
	if (longi == 'nothing' && lati == 'nothing'){
		longi = req.session.longitude;
		lati = req.session.latitude;
	}
	let db = await mongo.connect(url);
	let loc = {
				$nearSphere: {
					$geometry: {
						type : "Point",
						coordinates : [ longi, lati ]
					},
					$minDistance: 0,
					$maxDistance: 100000
				}
			};
	if (req.session.sex == "homme" && req.session.orientation == "hetero")
	{
		return db.collection('users').find({
			login: {
				$ne: req.session.user
			}, sex: 'femme', orientation: {
				$ne: 'hommo'
			}, loc: loc,
			bloker_users: {
				$nin: [req.session.user]
			}
		}).toArray();
	}
	else if (req.session.sex == "homme" && req.session.orientation == "hommo")
	{
		return db.collection('users').find({
			login: {
				$ne: req.session.user
			}, sex: 'homme', orientation: {
				$ne: 'hetero'
			}, loc: loc
		}).toArray();
	}
	else if (req.session.sex == "homme" && req.session.orientation == "bi")
	{
		return db.collection('users').find( {login: {$ne: req.session.user}, $or: [ { sex: 'homme', orientation: { $ne: 'hetero' } }, { sex: 'femme', orientation: { $ne: 'hommo' } } ], loc: loc
																																															}).toArray();
	}
	else if (req.session.sex == "femme" && req.session.orientation == "hetero")
	{
		return db.collection('users').find({login: {$ne: req.session.user}, sex: 'homme', orientation: {$ne: 'hommo'}, loc: loc
																														}).toArray();
	}
	else if (req.session.sex == "femme" && req.session.orientation == "hommo")
	{
		return db.collection('users').find({login: {$ne: req.session.user}, sex: 'femme', orientation: {$ne: 'hetero'}, loc: loc
																															}).toArray();
	}
	else if (req.session.sex == "femme" && req.session.orientation == "bi")
	{
		return db.collection('users').find( {login: {$ne: req.session.user},  $or: [ { sex: 'femme', orientation: { $ne: 'hetero' } }, { sex: 'homme', orientation: { $ne: 'hommo' } } ], loc: loc
																																														 }).toArray();
	}
	else {
		return new Error('Problem!');
	}
}

getViewers = async (req) => {
let db = await mongo.connect(url);
var viewers = await db.collection('users').find(
	{
		login: req.session.user,
	},
	{
			viewer_profil: 1
	}
).toArray();
return(viewers[0].viewer_profil);
}



router.get('/', async function(req, res, next) {
	if (!req.session.user) {
		res.redirect('/');
	} else {
		let users = [];
		try {
			viewers = await getViewers(req);
			users = await getUsers(req, 'nothing', 'nothing');
		} catch (e) {
			console.log(e);
		}
		res.render('home', { title: req.session.user, users: users, viewers: viewers, toto: "bite"});
	}
});




getPointsCommuns = async (arr1, arr2) => {
	let nb = 0;
	let taille1 = arr1.length;
	let taille2 = arr2.length;
	for (var i = 0; i < taille1; i++){
		for (var j = 0; j < taille2; j++){
			if (arr1[i] == arr2[j])
			{
				nb++;
			}
		}
	}
	return(nb);
}


/*tri = async (tab) => {
	let array = [];
	let taille = tab.length;

	for (var i = 0; i < taille - 1; i++)
	{
		let toto = 0;
		if (tab[i].nb < tab[i + 1].nb)
		{
			var b = tab[i];
			tab[i] = tab[i + 1];
			tab[i + 1] = b;
		}
	}
	return(tab);
}*/


giveTab = async (req, users, array, array_of_interets, tab) => {
	users.forEach(async function(doc, err){
		if (doc.age >= req.body.age_min && doc.age <= req.body.age_max)
		{
			if (req.body.interets){
				if (array && doc.interets)
				{
					points_en_communs = await getPointsCommuns(array_of_interets, doc.interets);
				}
				else
					points_en_communs = 0;
				var new_obj = {nb: points_en_communs, login: doc.login};
				tab.push(new_obj);
			}
			array.push(doc);
		}
	});
  return ({array: array, tab: tab});
}


const getCoordsOfAdresse = function(adresse) {
  return new Promise(function(res, rej) {
    geocoder.geocode(adresse, function(err, result) {
  		if (result){
        console.log('IIIIIIIIIIIIIIIIIIIIICCCCCCCCCCCCCCCCCCCC');
  			console.log('dans le result');
        if (result[0] == undefined)
          res({longitude: 'nothing', latitude: 'nothing'});
        else
          res({longitude: result[0].longitude, latitude:	 result[0].latitude});
  		}
  		else {
  			console.log('pas dans le result');
  			res({longitude: 'nothing', latitude: 'nothing'});
  		}
  	});
  })
}

getUsersAboutCoords = async (req) => {
	let array_users = [];
	if (req.body.adresse)
	{
    console.log('IL Y A UNE ADRESSE')
		coord = await getCoordsOfAdresse(req.body.adresse);
    console.log(coord);
		array_users = await getUsers(req, coord.longitude, coord.latitude);
	}
	else {
		console.log('NON IL Y A PAS D ADRESSE')
		array_users = await getUsers(req, 'nothing', 'nothing');
	}
	return (array_users)
}





router.post('/filtres', async function(req, res, next) {
	//let db = await mongo.connect(url);
	let array = [];
	let points_en_communs = 0;
	let count = 0;
	let tab = [];
	let array_of_interets = [];
	let array_trie = [];
	let array_users = [];

	array_users = await getUsersAboutCoords(req);

	if (req.body.interets){
		array_of_interets = await splitInterets(req.body.interets);
		//array_users = await getUsers(req, 'nothing', 'nothing');
		console.log(array_users);
		result = await giveTab(req, array_users, array, array_of_interets, tab)

		tab = result.tab;
    array = result.array
		var new_tab = _.sortBy(tab, 'nb').reverse();

		while(new_tab.length != array_trie.length){
			new_tab.forEach(function(doc, err){
				array.forEach(function(res, err){
					if (doc.login == res.login)
						array_trie.push(res);
				})
			});
		}
		array = null;
		array = array_trie;
	}
	else {
		userCorrespondAge = await giveTab(req, array_users, array, null, tab);
    array = userCorrespondAge.array;
	}
	res.end(JSON.stringify(array));
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

splitInterets = async (str) => {
	return str.replace(/\s\s+/g, ' ').split(" ");
}



router.post('/edit_profil', upload,function(req, res, next) {
	if (req.session.user) {
			mongo.connect(url, async function(err, db){
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
					let array = [];
					array = await splitInterets(req.body.interets);
					console.log(array);
					db.collection('users').updateOne(
	 			      { login: req.session.user },
	 			      { $addToSet: { interets: {$each: array }}
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
