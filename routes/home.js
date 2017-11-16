var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');

var url = 'mongodb://localhost:27017/db_matcha';


router.get('/', function(req, res, next) {
	req.session.user = "toto";
	if (!req.session.user) {
		res.redirect('/');
	} else {
		res.render('home', { title: req.session.user });
	}
});

module.exports = router;
