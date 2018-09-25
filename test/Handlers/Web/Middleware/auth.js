// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line
// regular modules
const assert = require('assert');
const Mebo = require('../../../../src');
const testutils = require('../../../../testutils');

const Action = Mebo.Action;


describe('Web Middleware Auth:', () => {
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

  const passportAuth = passport.authenticate('basic', {session: false});

  before((done) => {
    // registrations
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum');
    Mebo.Action.register(TestBeforeMiddleware, 'testBeforeMiddleware');

    // auth
    passport.use(new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'user'
          && password.valueOf() === '123456'){
          return authDone(null, 'user');
        }
        return authDone(null, false);
      },
    ));

    // express server
    app = express();
    app.use(passport.initialize());
    Mebo.Handler.get('web').addBeforeAuthAction(passportAuth);

    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    // cleaning any registration made by other tests
    Mebo.Handlers.Web.clearBeforeAuthAction();

    if (server){
      server.close();
    }
  });

  it('Should fail to perform an action that requires auth without any login', (done) => {
    Mebo.Handler.grantAction('web', 'sum', {auth: true, rest: false});

    app.get('/authSum', Mebo.Handler.get('web').middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/authSum?a=10&b=10`, (err, response, body) => {

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

  it('Should perform an action that requires auth', (done) => {
    Mebo.Handler.grantAction('web', 'sum', {auth: true, rest: false});

    app.get('/authSum', Mebo.Handler.get('web').middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://user:123456@localhost:${port}/authSum?a=10&b=10`, (err, response, body) => {

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
});
