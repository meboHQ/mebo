const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Input Property:', () => {

  it('Should return the registered property names', () => {
    const propertyNames = Input.registeredPropertyNames(Input);
    const expectedPropertyNames = [
      'required',
      'immutable',
      'defaultValue',
      'vector',
      'hidden',
      'autofill',
      'description',
    ];

    assert.equal((expectedPropertyNames.filter(x => !propertyNames.includes(x))).length, 0);
  });

  it('Should return the available property names', () => {

    const input = new Input('inputName');
    input.assignProperty('test', true, true);
    assert(input.propertyNames().includes('test'));
  });

  it('Should fail when querying a non-existing property', () => {

    let error = null;
    const input = new Input('inputName');

    try{
      input.property('non-existing');
    }
    catch(err){
      error = err;
    }

    assert(error);
    assert(minimatch(error.message, 'Property * is not registered!'));
  });

  it('Should fail when assigning a non-existing property', () => {

    let error = null;
    const input = new Input('inputName');

    try{
      input.assignProperty('non-existing', 10);
    }
    catch(err){
      error = err;
    }

    assert(error);
    assert(minimatch(error.message, 'Property * is not registered!'));
  });

  it('Should check the values of custom properties', () => {
    const input = new Input('name');

    input.assignProperty('propertyA', 1, true);
    input.assignProperty('propertyB', 2, true);
    input.assignProperty('propertyC', 3, true);

    assert.equal(input.property('propertyA'), 1);
    assert.equal(input.property('propertyB'), 2);
    assert.equal(input.property('propertyC'), 3);
  });

  it('Initial Value should match value defined at constructing time', () => {
    const i = new Input('test', {defaultValue: 'foo'});
    assert.equal(i.property('defaultValue'), 'foo');
    assert.equal(i.value(), 'foo');
  });

  it("When the property 'required' is set (comes on by default), it should not allow null or undefined types", (done) => {
    const input3 = new Input('test');
    input3.setValue(null);

    input3.validate.bind(input3)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '28a03a60-a405-4737-b94d-2b695b6ce156') ? null : err);
    });
  });

  it('Should not be able to assign a locked property', () => {
    let error = null;

    try{
      const input = new Input('test');
      input.assignProperty('customProperty', 10, true);
      input.lockProperty('customProperty');
      input.assignProperty('customProperty', 20, true);
    }
    catch(err){
      error = err;
    }

    assert(minimatch(error.message, 'Property * is locked!'));
  });

  it('Should not be able to assign a property in a read-only input', () => {
    let error = null;

    try{
      const input = new Input('test');
      input.assignProperty('customProperty', 10, true);
      input.setReadOnly(true);
      input.assignProperty('customProperty', 20, true);
    }
    catch(err){
      error = err;
    }

    assert(minimatch(error.message, 'Input * is read only, cannot be modified!'));
  });

  it('Should test the property lock', () => {

    const input = new Input('test');
    input.assignProperty('customProperty', 10, true);
    input.lockProperty('customProperty');
    assert(input.isPropertyLocked('customProperty'));

    input.lockProperty('customProperty', false);
    assert(!input.isPropertyLocked('customProperty'));

    input.assignProperty('customProperty', 5, true);
    assert.equal(input.property('customProperty'), 5);
  });

  it('Should not be able to lock a property in a read-only input', () => {
    let error = null;

    try{
      const input = new Input('test');
      input.assignProperty('customProperty', 10, true);
      input.setReadOnly(true);
      input.lockProperty('customProperty');
    }
    catch(err){
      error = err;
    }

    assert(minimatch(error.message, 'Input * is read only, cannot be modified!'));
  });

  it('Immutable flag can be disabled', () => {

    const inputA = new Input('input', {vector: true, immutable: false});
    inputA.setValue([1, 2, 3]);
    inputA.value()[1] = 'new value';

    assert.equal(inputA.value()[1], 'new value');
  });

  it('Should register a property using Mebo.registerProperty', () => {

    class CustomPropertyInput extends Input{}
    Mebo.registerInput(CustomPropertyInput);
    Mebo.registerProperty(CustomPropertyInput, 'myCustomProperty', true);
    assert(Input.registeredPropertyNames(CustomPropertyInput).includes('myCustomProperty'));
  });
});
