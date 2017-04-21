const assert = require('assert');
const Mebo = require('../../../../src');

const Action = Mebo.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Basic Inputs (Scalar):', () => {

  let server = null;
  let app = null;
  let port = null;

  class BasicInputTypes extends Action{
    constructor(){
      super();
      this.createInput('a: string');
      this.createInput('b: number');
      this.createInput('c: bool');
    }

    _perform(data){
      return Promise.resolve({
        a: data.a,
        b: data.b,
        c: data.c,
      });
    }
  }

  before((done) => {

    // registrations
    Mebo.registerAction(BasicInputTypes);

    // webfying actions
    Mebo.webfyAction(BasicInputTypes, ['get', 'post'], {restRoute: '/basicInputTypes'});

    // express server
    app = express();
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

  it('Should match the input values passed through a form', (done) => {

    request.post(`http://localhost:${port}/basicInputTypes`, {
      form: {
        a: 'text',
        b: 1.5,
        c: 1,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'text');
        assert.equal(result.data.b, 1.5);
        assert.equal(result.data.c, true);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should match the input values passed through a query string', (done) => {

    request(`http://localhost:${port}/basicInputTypes?a=text&b=1.5&c=1`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'text');
        assert.equal(result.data.b, 1.5);
        assert.equal(result.data.c, true);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should match the input values passed through a query string (different values)', (done) => {

    request(`http://localhost:${port}/basicInputTypes?a=text%20space&b=-1.5&c=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'text space');
        assert.equal(result.data.b, -1.5);
        assert.equal(result.data.c, false);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
