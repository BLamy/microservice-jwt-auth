'use strict';

const app = require('koa')();
const knex = require('knex');
const fs = require('fs-promise');
const jwt = require('koa-jwt');
const co = require('co');
const bcrypt = require('co-bcryptjs');
const router = require('koa-router')();
const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const koaBody = require('koa-body');

const port = process.env.PORT || 3000;
const DBNAME = './passport.sqlite';

//----------------------
//  Add database connection to `this.knex`
co(function* addKnexToContext() {
  let db = knex({
    client: 'sqlite3',
    connection: {
      filename: process.env.DBNAME || DBNAME
    }
  });
  try {
    yield db.schema.createTable('user', function(table) {
      table.increments();
      table.string('name').unique();
      table.string('password');
      table.timestamps();
    });
  } catch (ex) {} finally {
    app.context.knex = db;
  }
});

//----------------------
//  Setup a local passport strategy
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
    co(function*() {
      let results = yield this.knex('user').where({
        name: username
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

router.get('/', function*() {
  this.type = 'html';
  this.body = fs.createReadStream('views/login.html');
});

router.post('/login', koaBody({
  multipart: true
}), passport.authenticate('local', {
  session: false
}), function*() {
  let claims = {
    'username': "foo"
  };
  let options = {
    algorithm: 'RS256'
  };
  let privateKey = yield fs.readFile('demo.rsa');
  this.type = 'base64';
  this.body = jwt.sign(claims, privateKey, options);
});

router.post('/register', koaBody({
  multipart: true
}), function*(next) {
  var name = this.request.body.username;
  var salt = yield bcrypt.genSalt(10);
  var password = yield bcrypt.hash(this.request.body.password, salt);
  var created_at = new Date();
  var updated_at = created_at;

  if (name && password) {
    this.body = yield this.knex('user').returning('*').insert({
      name,
      password,
      created_at,
      updated_at
    });
    this.status = 200;
    return;
  }
  this.status = 400;
});

router.get('/app', jwt({
    secret: fs.readFileSync('demo.rsa.pub'),
    algorithm: 'RS256'
  }),
  function*() {
    this.type = 'html';
    this.body = fs.createReadStream('views/app.html');
  });

app.use(router.routes()).use(router.allowedMethods());

app.listen(port, () => console.log('Server listening on', port));
