var express = require('express');
var router = express.Router();
var app = require('../app');
var redis = require('redis');
var client = redis.createClient();
var uuid = require('node-uuid');
var nonce = uuid.v4();
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();

client.on("error", function (err) {
  console.log("Error " + err);
});

router.get('/', function(request, response, next) {
  if (request.cookies.username) {
    username = request.cookies.username;
  } else {
    username = null;
  }
  var knex = app.get('database');
  knex('tweets').select().then(function(tweets){
    tweets.reverse();
    response.render('index', { title: 'Welcome to Dandelion!', username: username, 'tweets': tweets});
  })
});

router.post('/register', function(request, response) {
  var email = request.body.email,
    username = request.body.username,
    password = request.body.password,
    password_confirm = request.body.password_confirm,
    database = app.get('database');
  database('users').where({'username': username}).then(function(res){
    if(res.length > 0){
      response.render('index', {
        title: "Welcome to Dandelion!",
        user: null,
        error: "Username is already in use, please try something else."
      });
    return;
    };
    var dataInfo = {
      email: email,
      username: username,
      password: password
    }; 
    client.set(nonce, JSON.stringify(dataInfo));
    if (password === password_confirm) {  
      transporter.sendMail({
        from: 'Dandy@Dandelion.com',
        to: email,
        subject: 'Welcome to Dandelion',
        text: 'You are now a new user. Click the link below...\n' + 
          'http://localhost:3000/verify_email/' +  nonce + '\nClick Here to Verify!'
      });
      response.render('emailver', {
        title: 'Thank you!',
        user: null
      });
    } else {
      response.render('index', {
        title: 'Welcome to Dandelion!',
        user: null,
        error: "Password didn't match confirmation"
      });
    }
  });
});

router.post('/login', function(request, response) {
  var username = request.body.username,
    password = request.body.password,
    database = app.get('database');
  database('users').where({'username': username}).then(function(records) {
    if (records.length === 0) {
      response.render('index', {
      title: 'Welcome to Dandelion!',
      user: null,
      error: "No such user"
      });
    } else {
      var user = records[0];
      if (user.password === password) {
        response.cookie('username', username);
        response.redirect('/');
      } else {
        response.render('index', {
          title: 'Welcome to Dandelion!',
          user: null,
          error: "Password incorrect"
        });
      }
    }
  });
});

router.post('/tweet', function(request, response) {
  var tweets = request.body.twit,
    database = app.get('database'),
    username = request.cookies.username;
      // date = request.dateTime();
        // console.log(date);
  database('tweets').insert({
    tweets: tweets,
    username: username
      // posted_at: Date.now()
  }).then(function() {
    response.redirect('/')
  });
});

router.get('/logout', function(request, response) {
  response.clearCookie('username');
  response.redirect('/');
});

router.get('/verify_email/:nonce', function(request, response) {
  client.get(request.params.nonce, function(err, dataInfo) {
    database = app.get('database');
    client.del(request.params.nonce, function() {
      if (dataInfo) {
        dataInfo = JSON.parse(dataInfo);
        database('users').insert({
          username: dataInfo.username,
          password: dataInfo.password,
          emailadd: dataInfo.email
        }).returning('id').then(function(userId) {
          response.cookie('username', dataInfo.username);
          response.cookie('id', userId);
          response.redirect('/');
        });
      } else {
        response.render('emailver',
        {error: "That verification code is invalid!"});
      }
    });
  });
});

module.exports = router;
