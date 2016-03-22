'use strict';

// Environment variables
const port = process.env.PORT || 3000;
const dbPath = process.env.SQLITE_PATH || './passport.sqlite';
const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'keys/demo.rsa';
const publicKeyPath = process.env.PUBLIC_KEY_PATH || 'keys/demo.rsa.pub';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

// Dependencies
const app = require('koa')();
const knex = require('knex');
const fs = require('fs-promise');
const co = require('co');
const bcrypt = require('co-bcryptjs');
const router = require('koa-router')();
const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const serve = require('koa-static');
const mount = require('koa-mount');
const jwt = require('koa-jwt');

const koaBody = require('koa-body')({
  multipart: true
});
const authenticate = passport.authenticate('local', {
  session: false
});
const jwtVerifyOpts = {
  secret: fs.readFileSync(publicKeyPath),
  algorithm: 'RS256'
};

var decodeJWTBody = (jwt) => {
  let encodedClaims = new Buffer(jwt.split('.')[1], 'base64');
  return JSON.parse(encodedClaims.toString());
};

//----------------------
//  Add database connection to `this.knex`
co(function* addKnexToContext() {
  let db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath
    }
  });
  try {
    yield db.schema.createTable('user', function(table) {
      table.increments();
      table.string('username').unique();
      table.string('password');
      // table.date('last_token_iat')
      table.boolean('is_admin');
      table.timestamps();
    });

    // Create Admin user
    let username = adminUsername;
    let salt = yield bcrypt.genSalt(10);
    let password = yield bcrypt.hash(adminPassword, salt);
    let created_at = new Date();
    let updated_at = created_at;
    let is_admin = true;
    yield db('user').returning('*').insert({
      username,
      password,
      created_at,
      updated_at,
      is_admin
    });

  } catch (ex) {} finally {
    app.context.knex = db;
  }
});

//----------------------
//  Setup a local passport strategy
(function addPassportLocalStrategy() {

  passport.serializeUser(function(user, done) {
    done(null, user.id)
  });

  passport.deserializeUser(function(id, done) {
    co(function*() {
      let results = yield this.knex('user').where({
        id
      });
      done(null, results[0])
    });
  });

  passport.use(new LocalStrategy(function(username, password, done) {
    co(function*() {
      let results = yield this.knex('user').where({
        username
      });
      let user = results[0];

      if (user && (yield bcrypt.compare(password, user.password))) {
        done(null, user)
      } else {
        done(null, false)
      }
    }.bind(app.context));
  }));

  app.use(passport.initialize());
  app.use(passport.session());
})();

app.use(mount('/bower_components', serve(__dirname + '/frontend/bower_components')));
app.use(serve('frontend/app'));

router.get('/', function*() {
  this.type = 'html';
  this.body = fs.createReadStream('frontend/app/index.html');
});

router.post('/login', koaBody, authenticate, function*() {
  let claims = this.passport.user;
  delete claims.password;

  let options = {
    algorithm: 'RS256'
  };
  let privateKey = yield fs.readFile(privateKeyPath);
  this.type = 'base64';
  this.body = jwt.sign(claims, privateKey, options);
});

router.get('/app', jwt(jwtVerifyOpts), function*() {
  this.type = 'html';
  this.body = fs.createReadStream('frontend/app/index.html');
});

router.get('/users', jwt(jwtVerifyOpts), function*() {
  this.type = 'html';
  this.body = yield this.knex('user');
});

router.post('/users', jwt(jwtVerifyOpts), koaBody, function*(next) {
  let claims = decodeJWTBody(this.headers.authorization);
  // TODO Lookup user to verify they are still an admin and that the token isn't stale.
  if (!claims.is_admin) {
    this.status = 403;
    return;
  }

  let username = this.request.body.username;
  let salt = yield bcrypt.genSalt(10);
  let password = yield bcrypt.hash(this.request.body.password, salt);
  let created_at = new Date();
  let updated_at = created_at;
  let is_admin = false;

  if (username && password) {
    var user = {
      username,
      password,
      created_at,
      updated_at,
      is_admin
    };
    user.id = (yield this.knex('user').returning('id').insert(user)).pop();
    this.body = user;
    this.status = 201;
    return;
  }
  this.status = 400;
});

router.delete('/users', jwt(jwtVerifyOpts), koaBody, function*(next) {
  let claims = decodeJWTBody(this.headers.authorization);
  if (!claims.is_admin) {
    this.status = 403;
    return;
  }

  let username = this.request.body.username;
  this.knex('user')
    .where({username})
    .del();
  this.status = 200;
});


app.use(router.routes()).use(router.allowedMethods());

app.listen(port, () => console.log('Server listening on', port));
