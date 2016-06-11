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

// Middleware
const koaBody = require('koa-body')({ multipart: true });
const authenticate = passport.authenticate('local', { session: false });
const jwtVerifyOpts = {
  secret: fs.readFileSync(publicKeyPath),
  algorithm: 'RS256'
};

/**
* Pulls the claims out of a JWT
*/
const decodeJWTBody = token => {
  const encodedClaims = new Buffer(token.split('.')[1], 'base64');
  return JSON.parse(encodedClaims.toString());
};

/**
* Serves the frontend application
*/
const serveHomepage = function*() {
  this.type = 'html';
  this.body = fs.createReadStream('frontend/app/index.html');
};

//----------------------
//  Add database connection to `this.knex`
co(function* addKnexToContext() {
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath
    }
  });
  try {
    yield db.schema.createTable('user', table => {
      table.increments();
      table.string('username').unique();
      table.string('password');
      // table.date('last_token_iat')
      table.boolean('is_admin');
      table.timestamps();
    });

    // Create Admin user
    const salt = yield bcrypt.genSalt(10);
    yield db('user').returning('*').insert({
      username: adminUsername,
      password: yield bcrypt.hash(adminPassword, salt),
      created_at: new Date(),
      updated_at: new Date(),
      is_admin: true
    });

  } catch (ex) {} finally {
    app.context.knex = db;
  }
});

//----------------------
//  Setup a local passport strategy
(function addPassportLocalStrategy() {

  passport.serializeUser((user, done) => { done(null, user.id) });

  passport.deserializeUser((id, done) => {
    co(function*() {
      const [user] = yield this.knex('user').where({ id });
      done(null, user)
    });
  });

  passport.use(new LocalStrategy((username, password, done) => {
    co(function*() {
      const [user] = yield this.knex('user').where({ username });
      const passwordsMatch = yield bcrypt.compare(password, user.password);
      if (user && passwordsMatch) {
        done(null, user)
      } else {
        done(null, false)
      }
    }.bind(app.context));
  }));

  app.use(passport.initialize());
  app.use(passport.session());
})();

// Mount static resources
app.use(mount('/bower_components', serve(__dirname + '/frontend/bower_components')));
app.use(serve('frontend/app'));
router.get('/', serveHomepage);
router.get('/app', jwt(jwtVerifyOpts), serveHomepage);

/**
* Attempts to authenticate the user
*/
router.post('/login', koaBody, authenticate, function*() {
  let claims = this.passport.user;
  delete claims.password;

  const options = { algorithm: 'RS256' };
  const privateKey = yield fs.readFile(privateKeyPath);

  this.type = 'base64';
  this.body = jwt.sign(claims, privateKey, options);
});

/**
* Gets a list of all users
*/
router.get('/users', jwt(jwtVerifyOpts), function*() {
  this.type = 'html';
  this.body = yield this.knex('user');
});

/**
* Allows admins to create new users
*/
router.post('/users', jwt(jwtVerifyOpts), koaBody, function*(next) {
  const claims = decodeJWTBody(this.headers.authorization);
  if (!claims.is_admin) {
    this.status = 403;
    return;
  }

  const username = this.request.body.username;
  const salt = yield bcrypt.genSalt(10);
  const password = yield bcrypt.hash(this.request.body.password, salt);
  const created_at = new Date();
  const updated_at = created_at;
  const is_admin = false;

  if (username && password) {
    const user = { username, password, created_at, updated_at, is_admin };
    [user.id] = yield this.knex('user').returning('id').insert(user);
    this.body = user;
    this.status = 201;
    return;
  }
  this.status = 400;
});

/**
* Allows admins to delete users
*/
router.delete('/users', jwt(jwtVerifyOpts), koaBody, function*(next) {
  const claims = decodeJWTBody(this.headers.authorization);
  if (!claims.is_admin) {
    this.status = 403;
    return;
  }

  const username = this.request.body.username;
  this.knex('user').where({ username }).del();
  this.status = 200;
});


app.use(router.routes()).use(router.allowedMethods());

app.listen(port, _ => console.log('Server listening on', port));
