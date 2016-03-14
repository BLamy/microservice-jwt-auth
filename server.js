'use strict';

const koa = require('koa');
const knex = require('knex');
const Promise = require('bluebird');
const fs = require('fs-promise');
const jwt = require('koa-jwt');
const router = require('koa-router')();
const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('koa-bodyparser');

const app = koa();
const port = process.env.PORT || 3000;
const DBNAME = './passport.sqlite';

app.use(bodyParser());

//addKnexToContext
Promise.coroutine(function*() {
  let env = process.env;
  let db = knex({
    client: 'sqlite3',
    connection: {
      // host: conn.host || env.KOA_KNEX_HOST,
      // port: conn.port || env.KOA_KNEX_PORT,
      // user: conn.user || env.KOA_KNEX_USER,
      // password: conn.password || env.KOA_KNEX_PASSWORD,
      // database: conn.database || env.KOA_KNEX_DATABASE,
      // charset: conn.charset || env.KOA_KNEX_CHARSET,
      // ssl: conn.ssl || env.KOA_KNEX_SSL,
      // debug: conn.debug || env.KOA_KNEX_DEBUG,

      /** For SQLite 3: http://knexjs.org/#Initialize */
      filename: env.KOA_KNEX_FILENAME || DBNAME
    }
  });

  yield db.schema.createTableIfNotExists('user', function(table) {
    table.increments();
    table.string('name');
    table.string('password');
    table.timestamps();
  });

  app.context.knex = db;
})();

(function addPassportLocalStrategy() {
  var user = {
    id: 1,
    username: 'test'
  };

  passport.serializeUser(function(user, done) {
    done(null, user.id)
  });

  passport.deserializeUser(function(id, done) {
    done(null, user)
  });

  passport.use(new LocalStrategy(function(username, password, done) {
    // retrieve user ...
    console.log(`${username} : ${password}`);
    if (username === 'test' && password === 'test') {
      done(null, user)
    } else {
      done(null, false)
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
})();

router.get('/', function*() {
  this.type = 'html';
  this.body = fs.createReadStream('views/login.html');
});

router.get('/failure', function*() {
  this.type = 'html';
  this.body = fs.createReadStream('views/login.html');
});

router.post('/login', passport.authenticate('local', {
  session: false
}), function*() {
  let privateKey = yield fs.readFile('demo.rsa');
  let claims = { 'username': "foo" };
  let options = { algorithm: 'RS256' };
  this.type = 'base64';
  this.body = jwt.sign(claims, privateKey, options);
});

router.post('register', function*() {

});

router.get('/app', function*() {
  this.type = 'html';
  this.body = fs.createReadStream('views/app.html');
});

// app.use(route.get('/:userid', function *(userid) {
//   this.body = {
//     profile: yield this.knex('users').where('id', userid);
//   };
// });

app.use(router.routes()).use(router.allowedMethods());
app.listen(port, () => console.log('Server listening on', port));

module.exports = app;
