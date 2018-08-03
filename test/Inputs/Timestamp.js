const assert = require('assert');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Timestamp Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: timestamp');
    assert.equal(input.value(), null);
  });

  it('Should create the input using the alias: date', () => {
    const input = Input.create('input: date');
    assert(input instanceof Mebo.Inputs.Timestamp);
  });

  it('Date value should be accepted', () => {
    const input = Input.create('input: timestamp');
    input.setValue(new Date());

    return input.validate.bind(input)();
  });

  it('Invalid date value should be allowed', (done) => {
    const input = Input.create('input: timestamp');
    input.setValue(new Date('invalid'));

    input.validate.bind(input)().then((value) => {
      done(new Error(`unexpected value ${value}`));
    }).catch((err) => {
      done();
    });
  });

  const stringValue = String(new Date());
  it('Value should be able to be parsed from a string', () => {
    const input = Input.create('input: timestamp');
    input.parseValue(stringValue);

    return input.validate.bind(input)();
  });

  it('Value should be able to be serialized as string', (done) => {
    const input = Input.create('input: timestamp');
    input.parseValue(stringValue);

    input.serializeValue().then((value) => {
      done(value === stringValue ? null : new Error(`unexpected value: ${value}`));
    }).catch((err) => {
      done(err);
    });
  });
});
