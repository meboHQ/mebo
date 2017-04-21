const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../../src');

const Input = Mebo.Input;


describe('Buffer Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: buf');
    assert.equal(input.value(), null);
  });

  it('Should create the input using the alias: buffer', () => {
    const input = Input.create('input: buffer');
    assert(input instanceof Mebo.Ext.Inputs.Buf);
  });

  it('Input should fail when validating an empty value, it makes sure that the super class is being called', (done) => {
    const input = Input.create('input: buffer');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '28a03a60-a405-4737-b94d-2b695b6ce156' ? null : err);
    });
  });

  it('Integer should not be considered as buffer', (done) => {
    const input = Input.create('input: buffer');
    input.setValue(1);
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('A buffer value should be valid', () => {
    const input = Input.create('input: buffer');
    input.setValue(Buffer.from('test', 'ascii'));
    return input.validate.bind(input)();
  });

  it('Value should be able to be parsed from a string', () => {

    const bufferValue = Buffer.from('test', 'ascii');
    const input = Input.create('input: buffer');
    input.parseValue(bufferValue.toString('base64'));
    assert.equal(bufferValue.toString('ascii'), input.value().toString('ascii'));
  });

  it('Value should be able to be serialized as string', (done) => {
    const buf = Buffer.from('test', 'ascii');
    const input = Input.create('input: buffer');
    input.setValue(buf);

    input.serializeValue().then((value) => {
      done(value === buf.toString('base64') ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });

  it('Should not allow a buffer that exceeds the maximum length', (done) => {
    const buf = Buffer.from('test', 'ascii');
    const input = Input.create('input: buffer', {maxLength: 3});
    input.setValue(buf);

    input.serializeValue().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'input: Value exceeds the maximum length') ? null : err);
    });
  });

  it('Should allow a buffer that does not exceed the maximum length', () => {
    const buf = Buffer.from('test', 'ascii');
    const input = Input.create('input: buffer', {maxLength: 100});
    input.setValue(buf);

    return input.serializeValue();
  });
});
