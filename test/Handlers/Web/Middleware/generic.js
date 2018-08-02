const assert = require('assert');
const Mebo = require('../../../../src');
const testutils = require('../../../../testutils');

const Action = Mebo.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Middleware Generic:', () => {
  let server = null;
  let port = null;
  let app = null;

  class TestBeforeMiddleware extends Action{
    constructor(){
      super();
      this.createInput('a: numeric', {autofill: 'customValue'});
    }
    _perform(data){
      return data.a;
    }
  }

  before((done) => {
    // registrations
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum');
    Mebo.Action.register(TestBeforeMiddleware, 'testBeforeMiddleware');

    // express server
    app = express();
    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    // cleaning any registration made by other tests
    Mebo.Handlers.Web._beforeActionMiddlewares = [];

    if (server){
      server.close();
    }
  });

  // tests
  it('Should perform an action', (done) => {
    Mebo.Handler.grantAction('web', 'sum');

    app.get('/sum', Mebo.Handler.get('web').middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'result: 20');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through a non webfied method (patch)', (done) => {
    Mebo.Handler.grantAction('web', 'sum', {auth: false, rest: false});

    app.patch('/sum', Mebo.Handler.get('web').middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    app.use((err, req, res, next) => {
      res.status(err.status || 500);
      res.json({
        message: err.message,
        error: err,
      });
    });

    request.patch(`http://localhost:${port}/sum?a=10&b=10`, (err, response, body) => {

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

  it('Should perform an action and handle the error result', (done) => {
    Mebo.Handler.grantAction('web', 'sum', {auth: false, rest: false});

    app.get('/sum2', Mebo.Handler.get('web').middleware('sum', (err, result, req, res, next) => {
      if (err && err.code === '28a03a60-a405-4737-b94d-2b695b6ce156'){
        res.send('success');
      }
      else{
        next(new Error('It did not get an error as it was expected'));
      }
    }));

    request(`http://localhost:${port}/sum2?a=10`, (err, response, body) => {
      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'success');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Tests if Mebo.Handler.get("web").addBeforeAction middlewares are being called', (done) => {

    Mebo.Handler.get('web').addBeforeAction((req, res, next) => {
      res.locals.web.session().setAutofill('customValue', 13);
      next();
    });

    Mebo.Handler.grantAction('web', 'testBeforeMiddleware');

    app.get('/beforeMiddlewareTest', Mebo.Handler.get('web').middleware('TestBeforeMiddleware', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/beforeMiddlewareTest`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'result: 13');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
