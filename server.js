'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ObjectID } = require('mongodb');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const auth = require('./auth.js');
const routes = require('./routes.js');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);


fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'pug');
app.set('views', './views/pug');
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  // console.log("DB connected");
  auth(app, myDataBase);
  routes(app, myDataBase);


  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});


let currentUsers = 0;

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

io.on('connection', (socket) => {
  currentUsers++;
  io.emit('user count', currentUsers);
  socket.on('disconnect', () => {
    currentUsers--;
    io.emit('user count', currentUsers);
    console.log('A user has disconnected');
  });
  console.log('A user has connected');
})
