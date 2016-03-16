'use strict'
const expect = require('chai').expect;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('supertest')('http://localhost:3000');
let app;

// Delete DB
before(done => {
  fs.unlink(path.join(__dirname, '../passport.sqlite'), () => done());
});

after(done => {
  fs.unlink(path.join(__dirname, '../passport.sqlite'), () => done());
});

// Start Server
before(done => {
  app = require('../server.js');
  setTimeout(done, 1000); // Hack to wait for server to go up.
});

describe('Microservice jwt auth', () => {
  let adminJwt;
  let userJwt;

  before(done => {
    http.post('/login')
      .send({ username: 'admin', password: 'admin' })
      .end(function(err, res) {
        adminJwt = res.text;
        done();
      });
  });

  before(done => {
    http.post('/users')
      .set('Authorization', `Bearer ${adminJwt}`)
      .send({ username: 'test', password: 'test' })
      .end(function(err, res) {
        http.post('/login')
          .send({ username: 'test', password: 'test' })
          .end(function(err, res) {
            userJwt = res.text;
            done();
          });
      });
  });

  describe('Server is up', () => {
    it('should return 200', done => {
      http.get('/').expect(200, done);
    });

    it('should create an admin user', done => {
      http.post('/login')
        .send({ username: 'admin', password: 'admin' })
        .expect(200, done);
    });
  });

  describe('Login', () => {

    it('should return unauthorized for bad login', done => {
      http.post('/login')
        .send({ username: 'test', password: 'wrong' })
        .expect(401, done);
    });

    it('Should return JWT on successful login.', done => {
      http.post('/login')
        .send({ username: 'test', password: 'test' })
        .end(function(err, res) {
          let encodedClaims = new Buffer(res.text.split('.')[1], 'base64');
          let claims = JSON.parse(encodedClaims.toString());
          expect(claims.username).to.equal('test');
          done();
        });
    });
  });

  describe('Test JWT Authentication on /app', () => {

    it('Should not allow access without JWT', done => {
      http.get('/app')
        .expect(401, done);
    });

    it('Should allow access with JWT', done => {
      http.get('/app')
        .set('Authorization', `Bearer ${userJwt}`)
        .expect(200, done)
    });
  });

  describe('bower_components', () => {
    it('Should expose bower_components publicly', done => {
      http.get('/bower_components/polymer/polymer.html').expect(200, done);
    });
  });

  describe('GET /users', () => {
    it('Should 401 without jwt', done => {
      http.get('/users').expect(401, done);
    });

    it('Should allow access with jwt', done => {
      http.get('/users')
        .set('Authorization', `Bearer ${userJwt}`)
        .expect(200, done);
    });
  });

  describe('POST /users', () => {
    it('User registation should not work without JWT', done => {
      http.post('/users')
        .send({ username: 'register', password: 'register' })
        .expect(401, done)
    });

    it('User registation should not work if user is not admin', done => {
      http.post('/users')
        .set('Authorization', `Bearer ${userJwt}`)
        .send({ username: 'register', password: 'register' })
        .expect(403, done)
    });

    it('Admin should be able to create new user account', done => {
      http.post('/users')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ username: 'register', password: 'register' })
        .expect(201, done)
    });
  });

  describe('DELETE /users', () => {
    it('Should 401 without jwt', done => {
      http.delete('/users')
        .send({ username: 'test' })
        .expect(401, done)
    });

    it('Should 403 with non-admin jwt', done => {
      http.delete('/users')
        .set('Authorization', `Bearer ${userJwt}`)
        .send({ username: 'test' })
        .expect(403, done)
    });

    it('Should allow access with admin jwt jwt', done => {
      http.delete('/users')
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ username: 'test' })
        .expect(200, done)
    });
  });


});
