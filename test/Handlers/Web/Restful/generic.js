const assert = require('assert');
const Mebo = require('../../../../src');
const testutils = require('../../../../testutils');

const Action = Mebo.Action;
const Settings = Mebo.Settings;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Restful Generic:', () => {

  let server = null;
  let app = null;
  let port = null;

  class ForceToFail extends Mebo.Action{
    _perform(data){
      return Promise.reject(new Error('Forced to fail'));
    }
  }

  class CheckRemoteAddress extends Action{
    constructor(){
      super();
      this.createInput('ipAddress: ip', {autofill: 'remoteAddress', hidden: true});
    }

    _perform(data){
      return Promise.resolve(data.ipAddress);
    }
  }

  class UndefinedResult extends Mebo.Action{
    _perform(data){
      return Promise.resolve();
    }
  }

  class JSONRepresentation extends Mebo.Action{
    _perform(data){

      class _CustomRepresentation{
        toJSON(){
          return {
            a: 1,
            b: 2,
          };
        }
      }

      return Promise.resolve(new _CustomRepresentation());
    }
  }

  before((done) => {

    // registrations
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum');
    Mebo.Action.register(ForceToFail, 'forceToFail');
    Mebo.Action.register(CheckRemoteAddress, 'checkRemoteAddress');
    Mebo.Action.register(UndefinedResult, 'undefinedResult');
    Mebo.Action.register(JSONRepresentation, 'JSONRepresentation');

    // webfying actions
    Mebo.Handler.grantAction('web', 'sum', {restRoute: '/A'});
    Mebo.Handler.grantAction('web', 'sum', {method: 'patch', restRoute: '/A/:a/test'});
    Mebo.Handler.grantAction('web', 'forceToFail', {restRoute: '/forceToFail'});
    Mebo.Handler.grantAction('web', 'checkRemoteAddress', {restRoute: '/checkRemoteAddress'});
    Mebo.Handler.grantAction('web', 'undefinedResult', {restRoute: '/undefinedResult'});
    Mebo.Handler.grantAction('web', 'JSONRepresentation', {restRoute: '/jsonRepresentation'});


    // express server
    app = express();
    server = app.listen(0, () => {
      done();
    });

    Mebo.Handler.get('web').restful(app);

    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  it('Should test if the remoteAddress is being set by the autofill', (done) => {
    request(`http://localhost:${port}/checkRemoteAddress?ipAddress=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, '::ffff:127.0.0.1');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should assign an input value as autofill', (done) => {

    class AvailableActionE extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text', {required: false});
      }

      _perform(data){
        return Promise.resolve({
          a: data.a,
          b: data.b,
          c: data.c,
        });
      }
    }

    Mebo.Action.register(AvailableActionE, 'availableActionE');

    class TestAutofillAction extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text');
      }

      _perform(data){
        const action = this.createAction('AvailableActionE');
        return action.run();
      }
    }

    Mebo.Action.register(TestAutofillAction, 'testAutofillAction');
    Mebo.Handler.grantAction('web', 'testAutofillAction', {method: 'post', auth: false, restRoute: '/TestAutofillAction'});
    Mebo.Handler.get('web').restful(app);

    const postFormData = {
      a: 'TestA',
      b: 'TestB',
      c: 'TestC',
    };

    request.post(`http://localhost:${port}/TestAutofillAction`, {formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'TestA');
        assert.equal(result.data.b, 'TestB');
        assert.equal(result.data.c, null);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest', (done) => {

    request(`http://localhost:${port}/A?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest specifying custom parameters', (done) => {

    request.patch(`http://localhost:${port}/A/20/test`, {formData: {b: 10}}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 30);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through GET when an input required is not defined', (done) => {

    request(`http://localhost:${port}/A?a=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, Settings.get('error/validationFail/status'));
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action that raises an exception', (done) => {

    request.get(`http://localhost:${port}/forceToFail`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 500);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through PATCH when the action is webfied with a different method', (done) => {

    request.patch(`http://localhost:${port}/A?a=10&b=30`, {formData: {a: 10, b: 30}}, (err, response, body) => {

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

  it('Should fail to perform an invalid action that is not registered', (done) => {

    request.delete(`http://localhost:${port}/A/SimpleSumActionDelete?a=10&b=30`, (err, response, body) => {
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

  it('Should test the defaults of the web handler', (done) => {
    class WebCustom extends Mebo.Handlers.Web{
    }

    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum.testDefault');
    Mebo.Handler.register(WebCustom, 'web', 'sum.testDefault');
    Mebo.Handler.grantAction('web', 'sum.testDefault', {auth: false, restRoute: '/testDefault'});
    Mebo.Handler.get('web').restful(app);

    request(`http://localhost:${port}/testDefault?a=5&b=5`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action using a registered with a custom route', (done) => {

    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum');
    Mebo.Handler.grantAction('web', 'sum', {auth: false, restRoute: '/:api/a/b/c/Sum'});
    Mebo.Handler.get('web').restful(app);

    request(`http://localhost:${port}/10.0.1/a/b/c/Sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should use a prefix in the restful support', (done) => {
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum.testPrefix');
    Mebo.Handler.grantAction('web', 'sum.testPrefix', {method: 'get', restRoute: '/testPrefix'});
    Mebo.Handler.get('web').restful(app, '/myApi');

    request(`http://localhost:${port}/myApi/testPrefix?a=5&b=5`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should use a final rest route that combines the prefix (supplied at restful) and a rest route that does not start with /', (done) => {
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum.testPrefix');
    Mebo.Handler.grantAction('web', 'sum.testPrefix', {restRoute: 'testPrefixJoin'});
    Mebo.Handler.get('web').restful(app, '/myApi');

    request(`http://localhost:${port}/myApi/testPrefixJoin?a=5&b=5`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should be able to response to an action that does not have a returning value', (done) => {

    request(`http://localhost:${port}/undefinedResult`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(Object.keys(result.data).length, 0);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should cast the value used in the response to the json representation defined in the result', (done) => {

    request(`http://localhost:${port}/jsonRepresentation`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(Object.keys(result.data).length, 2);
        assert.equal(result.data.a, 1);
        assert.equal(result.data.b, 2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
