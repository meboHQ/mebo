const assert = require('assert');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Version Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: version');
    assert.equal(input.value(), null);
  });

  it('Minimum required should fail when the input value has a version that is bellow of the required one', (done) => {
    const input = Input.create('input: version', {minimumRequired: '9.1.3'});
    input.setValue('9.0.3');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '524f9ed1-44e8-43d8-83b1-72dc8d33788b') ? null : err);
    });
  });

  it('Minimum required should allow a version that is greater than the required one', () => {
    const input = Input.create('input: version', {minimumRequired: '10.1.2'});
    input.setValue('10.1.3');
    return input.validate.bind(input)();
  });

  it('Minimum required should work when the input value is set with only major.minor version', () => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.setValue('10.0');
    return input.validate.bind(input)();
  });

  it('Minimum required should work when the input value is set with only major version', () => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.setValue('10');
    return input.validate.bind(input)();
  });

  it('Should fail when the version is not defined as string', (done) => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.setValue(10);
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });
});
