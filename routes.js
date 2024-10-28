'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ObjectID } = require('mongodb');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
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
            password: bcrypt.hashSync(req.body.password, process.env.SESSION_SECRET)
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

  )


  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}