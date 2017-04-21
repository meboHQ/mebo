const assert = require('assert');
const Mebo = require('../../../../../src');
const testutils = require('../../../../../testutils');

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line


describe('Web Restful Auth:', () => {

  let server = null;
  let app = null;
  let port = null;

  class WebCustomAuth1 extends Mebo.Ext.Handlers.Web{
    static beforeAuthAction(){
      const result = super.beforeAuthAction();
      result.push(passport.authenticate('basic', {session: false}));
      return result;
    }
  }

  class WebCustomAuth2 extends Mebo.Ext.Handlers.Web{
    static beforeAuthAction(){
      const result = super.beforeAuthAction();
      result.push(passport.authenticate('basic2', {session: false}));
      return result;
    }
  }

  before((done) => {

    // registrations
    Mebo.Handler.registerHandler(WebCustomAuth1, 'web', 'a.*');
    Mebo.Handler.registerHandler(WebCustomAuth2, 'web', 'b.*');

    Mebo.registerAction(testutils.Actions.Shared.Sum, 'a.simpleSumAction');
    Mebo.registerAction(testutils.Actions.Shared.Sum, 'a.simpleSumActionDelete');
    Mebo.registerAction(testutils.Actions.Shared.Sum, 'b.simpleSumAction');
    Mebo.registerAction(testutils.Actions.Shared.UploadAction, 'b.uploadAction');

    // webfying actions
    Mebo.webfyAction('a.simpleSumAction', ['get', 'post'], {auth: true, restRoute: '/A'});
    Mebo.webfyAction('a.simpleSumActionDelete', 'delete', {auth: true, restRoute: '/A'});
    Mebo.webfyAction('a.simpleSumAction', 'patch', {auth: true, restRoute: '/A/customName'});
    Mebo.webfyAction('b.simpleSumAction', ['get', 'post'], {auth: true, restRoute: '/B'});
    Mebo.webfyAction('b.simpleSumAction', 'patch', {auth: false, restRoute: '/B'});
    Mebo.webfyAction('b.uploadAction', 'put', {auth: true, restRoute: '/B'});

    // auth 1
    passport.use(new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'user' &&
          password.valueOf() === '1234'){
          return authDone(null, 'user');
        }
        return authDone(null, false);
      }));

    // auth 2
    const customBasicStrategy = new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'user2' &&
          password.valueOf() === '12345'){
          return authDone(null, 'user2');
        }
        return authDone(null, false);
      });
    customBasicStrategy.name = 'basic2';
    passport.use(customBasicStrategy);

    // express server
    app = express();
    app.use(passport.initialize());
    server = app.listen(0, () => {
      done();
    });

    Mebo.restful(app);
    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  it('Should execute an action using through a custom action route name', (done) => {

    request.patch(`http://localhost:${port}/A/customName`, {
      auth: {
        user: 'user',
        pass: '1234',
        sendImmediately: true,
      },
      formData: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through GET that is restricted by auth', (done) => {

    request.get(`http://localhost:${port}/B?a=10&b=30`, {
      auth: {
        user: 'user2',
        pass: '12345',
        sendImmediately: true,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through PATH without requiring auth', (done) => {

    request.patch(`http://localhost:${port}/B`, {
      formData: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST that is restricted by auth (Web.authentication)', (done) => {
    request.post(`http://localhost:${port}/A`, {
      auth: {
        user: 'user',
        pass: '1234',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(result.data.value, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST that is restricted by auth (custom Web.authentication)', (done) => {
    request.post(`http://localhost:${port}/B`, {
      auth: {
        user: 'user2',
        pass: '12345',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through DELETE (method not webfied by the action) that is restricted by auth (basic)', (done) => {
    request.delete(`http://localhost:${port}/B`, {
      auth: {
        user: 'user2',
        pass: '12345',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 404);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through PUT with single file upload that requires auth', (done) => {
    const postFormData = {
      a: 'A value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.put({url: `http://localhost:${port}/B`,
      auth: {
        user: 'user2',
        pass: '12345',
        sendImmediately: true,
      },
      formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);

        assert.equal(result.data.fileHash, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through DELETE that is restricted by auth', (done) => {

    request.delete(`http://localhost:${port}/A?a=20&b=30`, {
      auth: {
        user: 'user',
        pass: '1234',
        sendImmediately: false,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 50);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should not be able to perform an action through GET that requires auth', (done) => {

    request.get(`http://localhost:${port}/B?a=10&b=30`, {
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 401);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through GET by a wrong auth', (done) => {

    request.get(`http://localhost:${port}/B?a=10&b=30`, {
      auth: {
        user: 'user1',
        pass: '12345',
        sendImmediately: true,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 401);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
