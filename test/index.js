'use strict'
const http = require('http');
const expect = require('chai').expect;
const assert = require('assert');
const request = require('supertest')
const app = require('../server.js');

describe('Example Node Server', () => {
  let http = request('http://localhost:3000');

  it('should return 200', done => {
    http.get('/').expect(200, done);
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
