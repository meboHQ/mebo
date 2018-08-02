const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Input Registration:', () => {
  it('Should register a custom input type', () => {

    class CustomInput extends Input{}

    Input.register(CustomInput);
    Input.register(CustomInput, 'CustomInputName_.-1');

    assert(Input.registeredInputNames().includes('CustomInput'.toLowerCase()));
    assert(Input.registeredInputNames().includes('CustomInputName_.-1'.toLowerCase()));
  });

  it('Should fail to register a custom input type with invalid name', () => {

    class CustomInput extends Input{}

    Input.register(CustomInput);

    let error = null;
    try{
      Input.register(CustomInput, 'CustomInputName$');
    }
    catch(err){
      error = err;
    }

    if (error && minimatch(error.message, 'Illegal input name: *')){
      return;
    }

    throw error || new Error('Unexpected result');
  });

  it('Should factory a registered input through create', () => {

    class A extends Input{}

    Input.register(A);
    assert(Input.create('input: A') instanceof A);

    // testing the full creation interface
    assert.equal(Input.create('input?: A').property('required'), false);
    assert.equal(Input.create('input?: A[]').property('required'), false);

    assert.equal(Input.create('input: A').property('required'), true);
    assert.equal(Input.create('input: A[]').property('required'), true);

    // should fail when the creation syntax is not defined properly
    let syntaxFailed = false;
    try{
      Input.create('input A');
    }
    catch(err){
      syntaxFailed = true;
    }

    assert(syntaxFailed, 'It should fail when the syntax is not properly defined');

    // should fail when the type defined in the creation syntax is not found
    let typeFailed = false;
    try{
      Input.create('input: InvalidType');
    }
    catch(err){
      typeFailed = true;
    }
    assert(typeFailed, 'It should fail when creating an invalid input type');
  });

  it('Should fail to create an input through using a wrong syntax', () => {
    class A extends Input{}
    Input.register(A);

    let error = null;

    try{
      Input.create('input: A: A');
    }
    catch(err){
      error = err;
    }

    assert.equal(error.message, "Invalid input interface, it should follow the pattern: 'name: type'");
  });

  it('When querying an input name that is not registered it should raise an exception', () => {

    try{
      Input.registeredInput('InvalidRegisteredName');
    }
    catch(err){
      if (err.message !== 'Input InvalidRegisteredName is not registered!'){
        throw err;
      }
    }
  });

  it('Should register an input using Mebo.Input.register', () => {

    class CustomInput extends Input{}

    Mebo.Input.register(CustomInput, 'customNameUsingRegShortcut');
    assert(Input.registeredInputNames().includes('customNameUsingRegShortcut'.toLowerCase()));
  });

  it('Should create an input using Mebo.Input.create', () => {

    class CustomInput extends Input{}

    Mebo.Input.register(CustomInput, 'customNameUsingCreateShortcut');
    assert(Mebo.Input.create('input: customNameUsingCreateShortcut') instanceof CustomInput);
  });
});
