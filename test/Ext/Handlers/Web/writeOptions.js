const assert = require('assert');
const Mebo = require('../../../../src');
const testutils = require('../../../../testutils');

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Write Options:', () => {

  let server = null;
  let app = null;
  let port = null;

  class HeaderOnly extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.setMetadata('$webHeadersOnly', true);
    }
  }

  class SuccessStatus extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.setMetadata('$webSuccessStatus', 201);
    }
  }

  class CustomHeader extends Mebo.Action{
    constructor(){
      super();
      this.createInput('customDate: string');
    }

    _perform(data){
      this.setMetadata('$webHeaders.date', data.customDate);

      return Promise.resolve(data.customDate);
    }
  }

  class ForceResultLabel extends Mebo.Action{
    constructor(){
      super();
      this.createInput('resultType: string');
      this.createInput('resultLabel?: string');
    }

    _perform(data){

      if (data.resultLabel){
        this.setMetadata('$webResultLabel', data.resultLabel);
      }

      let result = 'a';
      if (data.resultType === 'vector'){
        result = ['a', 'b'];
      }
      if (data.resultType === 'object'){
        result = {a: 1, b: 2};
      }

      return Promise.resolve(result);
    }
  }

  class CustomOutput extends Mebo.Action{
    _perform(data){
      this.setMetadata('$webResult', {
        test: 1,
        test2: 2,
      });

      return Promise.resolve(true);
    }
  }

  class CustomRoot extends Mebo.Action{
    _perform(data){
      this.setMetadata('$webRoot', {
        test: 3,
        test2: 4,
      });

      return Promise.resolve(10);
    }
  }

  before((done) => {

    // registrations
    Mebo.registerAction(HeaderOnly);
    Mebo.registerAction(ForceResultLabel);
    Mebo.registerAction(SuccessStatus);
    Mebo.registerAction(CustomHeader);
    Mebo.registerAction(CustomOutput);
    Mebo.registerAction(CustomRoot);
    Mebo.registerAction(testutils.Actions.Shared.Sum, 'sum');

    // webfying actions
    Mebo.webfyAction('sum', 'get', {restRoute: '/sum'});
    Mebo.webfyAction(HeaderOnly, 'get', {restRoute: '/headersOnly'});
    Mebo.webfyAction(SuccessStatus, 'get', {restRoute: '/successStatus'});
    Mebo.webfyAction(CustomHeader, 'get', {restRoute: '/customHeader'});
    Mebo.webfyAction(ForceResultLabel, 'get', {restRoute: '/forceResultLabel'});
    Mebo.webfyAction(CustomOutput, 'get', {restRoute: '/output'});
    Mebo.webfyAction(CustomRoot, 'get', {restRoute: '/root'});

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

  it('Tests the option headersOnly, no data should be expected in the response', (done) => {

    request(`http://localhost:${port}/headersOnly?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, '');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should have a custom success status code', (done) => {

    request(`http://localhost:${port}/successStatus?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 201);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action with the context set', (done) => {

    request.get(`http://localhost:${port}/sum?a=10&b=30&context=test`, {
    }, (err, response, body) => {
      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.context, 'test');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should have a custom date header', (done) => {

    const testDate = 'Wed, 25 May 1984 22:01:00 GMT';
    request(`http://localhost:${port}/customHeader?customDate=${testDate}`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(testDate, response.headers.date);

        const result = JSON.parse(body);
        assert.equal(testDate, result.data.value);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a primitive value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=primitive`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal('a', result.data.value);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a primitive value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=primitive&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal('a', result.data.test);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a vector value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=vector`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = [
          'a',
          'b',
        ];

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value[0], result.data.items[0]);
        assert.equal(value[1], result.data.items[1]);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a vector value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=vector&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = [
          'a',
          'b',
        ];

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value[0], result.data.test[0]);
        assert.equal(value[1], result.data.test[1]);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for an object value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=object`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = {
          a: 1,
          b: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value.a, result.data.a);
        assert.equal(value.b, result.data.b);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for an object value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=object&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = {
          a: 1,
          b: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value.a, result.data.test.a);
        assert.equal(value.b, result.data.test.b);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test output option by defining a custom result', (done) => {

    request(`http://localhost:${port}/output`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const extendData = {
          test: 1,
          test2: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(result.data.value, undefined);
        assert.equal(extendData.test, result.data.test);
        assert.equal(extendData.test2, result.data.test2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test root option by defining a custom root that gets merged with the default root', (done) => {

    request(`http://localhost:${port}/root`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const extendData = {
          test: 3,
          test2: 4,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
        assert.equal(extendData.test, result.test);
        assert.equal(extendData.test2, result.test2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
