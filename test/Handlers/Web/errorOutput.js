const assert = require('assert');
const EventEmitter = require('events');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');

const Action = Mebo.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Error Output:', () => {

  let server = null;
  let app = null;
  let port = null;

  class NestedActionFail extends Action{
    _perform(data){
      return this.createAction('sum').run();
    }
  }

  class NestedActionHandler extends Mebo.Handlers.Web{
    static _outputEventEmitter = new EventEmitter();
  }

  before((done) => {
    // registrations
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'sum');
    Mebo.Action.register(NestedActionFail, 'nestedActionFail');

    // registering a custom handler for the nested action fail
    Mebo.Handler.register(NestedActionHandler, 'web', 'nestedActionFail');

    // webfying actions
    Mebo.Handler.grantAction('web', 'sum', {restRoute: '/topLevelValidationFail'});
    Mebo.Handler.grantAction('web', 'nestedActionFail', {restRoute: '/nestedActionFail'});

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

  it('Should response with the validation fail code raised by a top level action', (done) => {

    request(`http://localhost:${port}/topLevelValidationFail`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 400);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should not response with the validation fail code raised by a nested action', (done) => {

    NestedActionHandler.onErrorDuringOutput((err, name, mask) => {
      if (err.message === 'a: Input is required, it cannot be empty!'
        && name === 'web'
        && mask === 'nestedActionFail'.toLowerCase()){
        done();
      }
      else{
        done(err);
      }
    });

    request(`http://localhost:${port}/nestedActionFail`, (err, response, body) => {
      done(new Error('Should not have be able to response!'));
    });
  });
});
