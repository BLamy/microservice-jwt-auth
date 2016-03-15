'use strict'
const http = require('http');
const expect = require('chai').expect;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

describe('Microservice jwt auth', () => {
  let http = request('http://localhost:3000');
  let app;

  before(done => {
    fs.unlink(path.join(__dirname, '../passport.sqlite'), ()=>{
      app = require('../server.js');
      done()
    });
  });

  describe('Server is up', () => {
    it('should return 200', done => {
      http.get('/').expect(200, done);
    });
  });

  describe('Login', () => {
    before(done => {
      http.post('/register')
        .send({username: 'test', password: 'test'})
        .end(done);
    });

    it('should return unauthorized for bad login', done => {
      http.post('/login')
        .send({ username: 'test', password: 'wrong' })
        .expect(401, done);
    });

    it('Should return JWT on successful login.', done => {
      http.post('/login')
        .send({ username: 'test', password: 'test' })
        .expect(302)
        .end(function(err, res) {
          let encodedHeader = new Buffer(res.text.split('.')[0], 'base64');
          let header = JSON.parse(encodedHeader.toString());
          expect(header.typ).to.equal('JWT');
          done();
        });
    });
  });

  describe('Test JWT Authentication on /app', function () {
    let jwt;

    before(done => {
      http.post('/register')
        .send({username: 'tester', password: 'tester'})
        .end(function() {
          http.post('/login')
            .send({ username: 'tester', password: 'tester' })
            .expect(302)
            .end(function(err, res) {
              jwt = res.text;
              done();
            });
        });
    });

    it('Should not allow access without JWT', done => {
      http.get('/app')
        .expect(401, done);
    });

    it('Should allow access with JWT', done => {
      http.get('/app')
        .set('Authorization', `Bearer ${jwt}`)
        .expect(200, done)
    });
  });

});
