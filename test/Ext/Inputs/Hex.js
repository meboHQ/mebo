const assert = require('assert');
const Mebo = require('../../../src');

const Input = Mebo.Input;


describe('Hex Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: hex');
    assert.equal(input.value(), null);
  });

  it('Hex value should be accepted', () => {
    const input = Input.create('input: hex');
    input.setValue('58DC14D58C154011C2ABD97F');

    return input.validate.bind(input)();
  });

  it('Invalid hex value should be allowed', (done) => {
    const input = Input.create('input: hex');
    input.setValue('invalid-hex');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Should accept hex that matches the size property', () => {
    const input = Input.create('input: hex', {size: 96});
    input.setValue('58DC14D58C154011C2ABD97F');

    return input.validate.bind(input)();
  });

  it('Should not fail when hex value is under the allowed size', () => {
    const input = Input.create('input: hex', {size: 24});
    input.setValue('FFFF');

    return input.validate.bind(input)();
  });

  it('Should fail when hex value is over the allowed size', (done) => {
    const input = Input.create('input: hex', {size: 24});
    input.setValue('000000FF');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '0f8d2885-a4ac-4b7f-bb5b-32466c85363a') ? null : err);
    });
  });

  it('Should convert a hexadecimal to decimal value', () => {
    const input = Input.create('input: hex');
    input.setValue('FF');
    assert.equal(input.decimalValue(), 255);
  });

  it('Should be able to set a value from a decimal', () => {
    const input = Input.create('input: hex');
    input.setValueFromDecimal(255);
    assert.equal(input.value(), 'ff');
  });
});
