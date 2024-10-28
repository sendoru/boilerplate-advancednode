'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ObjectID } = require('mongodb');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const passportSocketIo = require('passport.socketio');
// add (session) in order to initialize new memory store
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');

const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const auth = require('./auth.js');
const routes = require('./routes.js');
const req = require('express/lib/request.js');

const URI = process.env.MONGO_URI;
// add store to session
const store = new MongoStore({ url: URI });

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const onAuthorizeSuccess = (data, accept) => {
  console.log('successful connection to socket.io');

  accept(null, true);
}

const onAuthorizeFail = (data, message, error, accept) => {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'pug');
app.set('views', './views/pug');
app.use(session({
  secret: process.env.SESSION_SECRET,
  key: 'express.sid',
  store: store,
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


io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

io.on('connection', (socket) => {
  console.log('A user has connected');
  currentUsers++;

  io.emit('user', {
    username: socket.request.user.username,
    currentUsers,
    connected: true
  });

  socket.on('disconnect', () => {
    currentUsers--;
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: false
    });
    console.log('A user has disconnected');
  });

  socket.on('chat message', (message) => {
    io.emit('chat message', {
      username: socket.request.user.username,
      message
    });
  });

});