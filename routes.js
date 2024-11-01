'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ObjectID } = require('mongodb');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const req = require('express/lib/request');
const salt = bcrypt.genSaltSync(12);
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

module.exports = function (app, myDataBase) {
  // Be sure to change the title
  app.route('/').get((req, res) => {
    res.render('index', {
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
      title: 'Connected to Database',
      message: 'Please log in'
    });
  });

  app.route('/login').post(
    passport.authenticate(
      'local',
      { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    })

  app.route('/profile').get(
    ensureAuthenticated, (req, res) => {
      res.render('profile', {
        username: req.user.username
      });
    });

  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.route('/register').post(
    (req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        }
        else if (user) {
          res.redirect('/');
        }
        else {
          myDataBase.insertOne({
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, salt)
          },
            (err, doc) => {
              if (err) {
                res.redirect('/')
              }
              else {
                next(null, doc.ops[0]);
              }
            })
        }
      })
    },
    passport.authenticate('local', { failureRedirect: "/" }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  app.route('/auth/github').get(
    // () => { console.log('github login detected') },
    passport.authenticate('github')
  );

  app.route('/auth/github/callback').get(
    passport.authenticate('github', {
      failureRedirect: '/'
    }),
    (req, res) => {
      req.session.user_id = req.user.id;
      res.redirect('/chat');
    }
  );


  app.route('/chat').get(
    ensureAuthenticated,
    (req, res) => {
      res.render('chat', {
        user: req.user
      })
    });

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}