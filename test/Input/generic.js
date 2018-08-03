const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../src');

const Input = Mebo.Input;
const ValidationFail = Mebo.Errors.ValidationFail;


describe('Input Generic:', () => {

  it("Input name should be 'test'", () => {
    assert.equal(new Input('test').name(), 'test');
  });

  it('Should set an input through setupFrom', () => {

    class CustomInput extends Input{}

    const a = new CustomInput('inputA', {defaultValue: 10});
    a.cache().set('value', 20);

    // with cache support
    const b = new CustomInput('inputB');
    b.setupFrom(a);
    assert.equal(b.cache().get('value'), a.cache().get('value'));
    assert.equal(b.value(), a.value());

    // without cache support
    const c = new CustomInput('inputC');
    c.setupFrom(a, null, false);
    assert(!c.cache().has('value'));
    assert.equal(c.value(), a.value());
  });

  it('Should not transfer a cache through setupFrom when either source or target input is not immutable', () => {

    class CustomInput extends Input{}

    const a = new CustomInput('inputA', {defaultValue: 10});
    a.cache().set('value', 20);

    const b = new CustomInput('inputB', {immutable: false});
    b.setupFrom(a);
    assert.equal(b.cache().get('value'), undefined);
  });

  it('When parsing an empty string for the value, it should assign null instead', () => {

    const inputA = new Input('input');
    inputA.setValue('test');
    inputA.parseValue('');
    assert.equal(inputA.value(), null);
  });

  it('Value assigned to the input should be set as immutable by default', () => {

    const inputA = new Input('input', {vector: true});
    inputA.setValue([1, 2, 3]);

    try{
      inputA.value()[1] = 'new value';
      throw new Error('Unexpected result');
    }
    catch(err){
      assert(minimatch(err.message, "Cannot assign to read only property '*' of object '*'"));
    }
  });

  it('Should test valueAt default argument (null)', () => {

    return (async () => {
      const inputA = new Input('input');
      inputA.setValue('my value');

      assert.equal(inputA.valueAt(), 'my value');
      assert.equal(await inputA._isCached(), false);
      assert.equal(await inputA._validation(), 'my value');
      inputA._setToCache('customKey', 'value');
      assert.equal(inputA._getFromCache('customKey'), 'value');
    })();
  });

  it('Should fail when the value of the input is not a vector and the input is setup as a vector', (done) => {

    const input1 = new Input('input', {vector: true});
    input1.setValue('not value');
    input1.validate().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === 'e03709a0-6c31-4a33-9f63-fa751948a6cb') ? null : err);
    });
  });

  it('Extended validation callback should fail when asking if the value is valid', (done) => {
    const input1 = new Input('test', {defaultValue: 'foo'}, function customValidation(){
      return new Promise((resolve, reject) => {
        if (this.value() !== 'new foo'){
          reject(new ValidationFail('oops, not yet'));
        }
        else{
          resolve(this.value());
        }
      });
    });

    input1.validate.bind(input1)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(JSON.parse(err.toJSON()).message === 'oops, not yet' ? null : err);
    });
  });

  it('Extended validation should not return any message', () => {
    const input2 = new Input('test', {}, function customValidation(){
      return new Promise((resolve, reject) => {
        if (this.value() !== 'new foo'){
          reject(new ValidationFail('oops, not yet'));
        }
        else{
          resolve(this.value());
        }
      });
    });

    input2.setValue('new foo');
    return input2.validate.bind(input2)();
  });

  it("Extended validation should have 'this' as context int the input object", () => {

    const input4 = new Input('test', {defaultValue: 'foo'}, function customValidation(){
      return new Promise((resolve, reject) => {
        if (this.property && this.property('customProperty1')){
          resolve();
        }
        else{
          reject(new ValidationFail(this.name(), 'Properties are not working'));
        }
      });
    });

    input4.assignProperty('customProperty1', true, true);

    return input4.validate.bind(input4)();
  });

  it('Input should have new value', () => {
    const i = new Input('name');

    i.setValue(10);
    assert.equal(i.value(), 10);
    i.setValue('foo');
    assert.equal(i.value(), 'foo');
  });

  it('Should not be able to set a value in a read-only input', () => {
    let error = null;

    try{
      const input = new Input('test');
      input.setReadOnly(true);
      input.setValue(10);
    }
    catch(err){
      error = err;
    }

    assert(minimatch(error.message, 'Input * is read only, cannot be modified!'));
  });
});
