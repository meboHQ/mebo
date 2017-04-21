const assert = require('assert');
const minimatch = require('minimatch');
const EventEmitter = require('events');
const Mebo = require('../src');
const testutils = require('../testutils');

const Handler = Mebo.Handler;
const Reader = Mebo.Reader;
const Writer = Mebo.Writer;
const Session = Mebo.Session;


describe('Handler:', () => {

  class CustomReader extends Reader{
    constructor(action){
      super(action);

      this.data = {};
    }

    _perform(inputList){
      const result = {};

      for (const input of inputList){
        const inputName = input.name();
        result[inputName] = this.data[inputName];
      }

      return Promise.resolve(result);
    }
  }

  class CustomWriter extends Writer{
    constructor(value){
      super(value);

      this.data = {};
    }

    _errorOutput(){
      this.data.value = super._errorOutput();
      return this.data.value;
    }

    _successOutput(){
      this.data.value = super._successOutput();
      return this.data.value;
    }
  }

  // dummy handler used by the tests bellow
  class CustomHandler extends Handler{
    constructor(...args){
      super(...args);

      this.testData = {};
      this.result = {};
    }

    _createReader(action, options){
      const reader = super._createReader(action, options);
      reader.data = this.testData;
      return reader;
    }

    _createWriter(value, options){
      const writer = super._createWriter(value, options);
      writer.data = this.result;
      return writer;
    }
  }

  class HiddenInput extends Mebo.Action{
    constructor(){
      super();
      this.createInput('someHiddenInput: text', {hidden: true});
    }
  }

  before(() => {
    // registering handler
    Handler.registerHandler(CustomHandler);
    Handler.registerReader(CustomReader, 'customHandler');
    Handler.registerWriter(CustomWriter, 'customHandler');

    // registering actions
    Mebo.registerAction(HiddenInput);
    Mebo.registerAction(testutils.Actions.Shared.PlainObjectResult, 'plainObjectResult');
  });

  it('Should check if the handler has been registered', () => {
    assert(Mebo.createHandler('CustomHandler') instanceof CustomHandler);
  });

  it('Should fail when trying to create an invalid handler', () => {
    let error = null;

    try{
      Mebo.createHandler('invalid');
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'Execution Handler: *, is not registered!'))){
      throw error || new Error('Unexpected result');
    }
  });

  it('Should test the registration of reader and writer for a handler with a custom name', () => {
    class CustomHandlerB extends CustomHandler{}
    class CustomReaderB extends CustomReader{}
    class CustomWriterB extends CustomWriter{}

    Handler.registerHandler(CustomHandlerB, 'customHandlerBName');
    Handler.registerReader(CustomReaderB, 'customHandlerBName');
    Handler.registerWriter(CustomWriterB, 'customHandlerBName');

    assert.equal(Handler.registeredHandler('customHandlerBName'), CustomHandlerB);
    assert(Mebo.createHandler('customHandlerBName') instanceof CustomHandlerB);

    assert.equal(Handler.registeredReader('customHandlerBName'), CustomReaderB);
    assert.equal(Handler.registeredWriter('customHandlerBName'), CustomWriterB);
  });

  it('Should check the registered handler names', () => {
    const beforeRegistratorNames = Handler.registeredHandlerNames();
    assert(!beforeRegistratorNames.includes('test'));
    Handler.registerHandler(CustomHandler, 'test');

    // the second registration should override the previous one (instead of adding a new one)
    Handler.registerHandler(CustomHandler, 'test');

    const afterRegistratorNames = Handler.registeredHandlerNames();
    assert(Handler.registeredHandlerNames().includes('test'));
    assert.equal(beforeRegistratorNames.length + 1, afterRegistratorNames.length);
  });

  it('Should check the registered handler masks', () => {

    class CustomHandlerMasksA extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksA, 'customHandlerMasks');

    let registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 1);
    assert.equal(registeredHandleNames[0], '*');

    // registering a handler for using a custom mask
    class CustomHandlerMasksB extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksB, 'customHandlerMasks', 'a.b.*');
    registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 2);
    assert.equal(registeredHandleNames[0], 'a.b.*');
    assert.equal(registeredHandleNames[1], '*');

    // registering a handler for using a custom mask (2)
    class CustomHandlerMasksC extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksC, 'customHandlerMasks', 'a.b.c.*');
    registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 3);
    assert.equal(registeredHandleNames[0], 'a.b.c.*');
    assert.equal(registeredHandleNames[1], 'a.b.*');
    assert.equal(registeredHandleNames[2], '*');

    // querying the handlers through the mask
    assert(Handler.create('customHandlerMasks', 'a.b.c.d').constructor === CustomHandlerMasksC);
    assert(Handler.create('customHandlerMasks', 'a.b.d').constructor === CustomHandlerMasksB);
    assert(Handler.create('customHandlerMasks', 'a.d').constructor === CustomHandlerMasksA);
    assert(Handler.create('customHandlerMasks').constructor === CustomHandlerMasksA);
  });

  it('Should create an handler with a custom session', () => {

    const session = new Session();
    session.setAutofill('myValue', 100);
    const handler = Mebo.createHandler('CustomHandler', '*', session);
    assert.equal(session.autofill('myValue'), handler.session().autofill('myValue'));
  });

  it('Should perform an action through the handler', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Mebo.createHandler('CustomHandler');
      handler.testData = {
        a: 'text',
        b: 20,
      };

      const result = await handler.execute('plainObjectResult');

      // testing the result of the action
      assert.equal(result.a, handler.testData.a);
      assert.equal(result.b, handler.testData.b);

    })();
  });

  it('Should perform and render an action through the handler', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Mebo.createHandler('CustomHandler');
      handler.testData = {
        a: 'A value',
        b: 30,
      };

      const result = await handler.execute('plainObjectResult');
      handler.output(result);

      // testing the result of the action
      assert.equal(result.a, handler.testData.a);
      assert.equal(result.b, handler.testData.b);

      // testing what was rendered
      assert.equal(handler.result.value.a, handler.testData.a);
      assert.equal(handler.result.value.b, handler.testData.b);

    })();
  });

  it('Should throw an exception when trying to finalize the session with a broken task inside of the handler output', (done) => {

    class SessionErrorHandler extends CustomHandler{
      static _output = new EventEmitter();
    }

    Handler.registerHandler(SessionErrorHandler);
    Handler.registerReader(CustomReader, 'sessionErrorHandler');
    Handler.registerWriter(CustomWriter, 'sessionErrorHandler');

    SessionErrorHandler.onErrorDuringOutput((err, name, mask) => {
      if (err.message === 'Should fail'
        && name === 'sessionErrorHandler'.toLowerCase()
        && mask === '*'){
        done();
      }
      else{
        done(err);
      }
    });

    (async () => {
      const handler = Mebo.createHandler('sessionErrorHandler');
      handler.session().wrapup().addWrappedPromise(() => Promise.reject(new Error('Should fail')));
      handler.testData = {
        a: 'A value',
        b: 30,
      };

      const result = await handler.execute('plainObjectResult');
      handler.output(result);

    })().then().catch(done);
  });

  it('Should throw an exception when trying to serialize the error that  has been set as output=false inside of the handler output', (done) => {

    class OutputErrorHandler extends CustomHandler{
      static _output = new EventEmitter();
    }

    Handler.registerHandler(OutputErrorHandler);
    Handler.registerReader(CustomReader, 'outputErrorHandler');
    Handler.registerWriter(CustomWriter, 'outputErrorHandler');

    OutputErrorHandler.onErrorDuringOutput((err, name, mask) => {
      if (err.message === 'someHiddenInput: Input is required, it cannot be empty!'
        && name === 'outputErrorHandler'.toLowerCase()
        && mask === '*'){
        done();
      }
      else{
        done(err);
      }
    });

    (async () => {
      let failed = true;
      const handler = Mebo.createHandler('outputErrorHandler');
      try{
        await handler.execute('hiddenInput');
        failed = false;
      }
      catch(err){
        handler.output(err);
      }

      assert(failed, 'It should have failed');

    })().then().catch(done);
  });

  it('Should not finalize the session when finalizeSession disabled inside of the handler output', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Mebo.createHandler('CustomHandler');
      handler.session().wrapup().addWrappedPromise(() => Promise.reject(new Error('Should fail')));
      handler.testData = {
        a: 'A value',
        b: 30,
      };

      const result = await handler.execute('plainObjectResult');
      handler.output(result, {}, false);
    })();
  });

  it('Should test if the exception is being emitted by the Handler during a session finalize error', () => {
    return (async () => {
      const handler = Mebo.createHandler('CustomHandler');

      // leaving the value empty on purpose
      let failed = true;
      let error;
      try{
        await handler.execute('plainObjectResult');
        failed = false;
      }
      catch(err){
        error = err;
        if (!(err instanceof Mebo.Error.ValidationFail)){
          throw err;
        }
        else{
          handler.output(err);
        }
      }

      if (!failed){
        throw new Error('Expected exception');
      }

      assert.equal(handler.result.value, error.toJSON());
    })();
  });

  it('Handler name should be included inside of the session arbitrary data', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Mebo.createHandler('customHandler');

      assert.equal(handler.session().get('handler'), 'customHandler'.toLowerCase());
    })();
  });
});
