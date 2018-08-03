const assert = require('assert');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Email Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: email');
    assert.equal(input.value(), null);
  });

  it('Should accept a valid email', () => {
    const input = Input.create('input: email');
    input.setValue('test@domain.com');

    return input.validate.bind(input)();
  });

  it('Should not accept an invalid email', (done) => {
    const input = Input.create('input: email');
    input.setValue('test@domain');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });
});
