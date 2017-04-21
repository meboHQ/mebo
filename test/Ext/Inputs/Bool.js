const assert = require('assert');
const Mebo = require('../../../src');

const Input = Mebo.Input;


describe('Bool Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: bool');
    assert.equal(input.value(), null);
  });

  it('Should create the input using the alias: boolean', () => {
    const input = Input.create('input: boolean');
    assert(input instanceof Mebo.Ext.Inputs.Bool);
  });

  it('Input should fail when validating an empty value, it makes sure that the super class is being called', (done) => {
    const input = Input.create('input: bool');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '28a03a60-a405-4737-b94d-2b695b6ce156' ? null : err);
    });
  });

  it('Integer should not be considered as boolean', (done) => {
    const input = Input.create('input: bool');
    input.setValue(1);
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Boolean value should be valid', () => {
    const input = Input.create('input: bool');
    input.setValue(true);
    return input.validate.bind(input)();
  });

  it('Value should be able to be parsed from a string', () => {
    const input = Input.create('input: bool');
    input.parseValue('true');
    assert.equal(input.value(), true);

    input.parseValue('1');
    assert.equal(input.value(), true);

    return input.validate.bind(input)();
  });

  it('Value should be able to be serialized as string', (done) => {
    const input = Input.create('input: bool');
    input.parseValue('true');

    input.serializeValue().then((value) => {
      done(value === '1' ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });

  it('Vector value should be able to be parsed directly from a json version', () => {
    const testValue = JSON.stringify([true, false, true]);
    const input = Input.create('input: bool[]');
    input.parseValue(testValue);

    assert.equal(input.value().length, 3);
    assert.equal(input.value()[0], true);
    assert.equal(input.value()[1], false);
    assert.equal(input.value()[2], true);
  });

  it('Vector value should be able to be parsed directly from a json version where each item is encoded as string', () => {
    return (async () => {

      const testValue = [true, false, true];
      const input = Input.create('input: bool[]');
      input.setValue(testValue);

      const serializedValue = await input.serializeValue();
      input.setValue(null);
      input.parseValue(serializedValue);

      assert.equal(input.value().length, 3);
      assert.equal(input.value()[0], true);
      assert.equal(input.value()[1], false);
      assert.equal(input.value()[2], true);
    });
  });

  it('Vector value should be able to be serialized as string', (done) => {
    const input = Input.create('input: bool[]');
    input.setValue([true, false, true]);

    input.serializeValue().then((value) => {
      done((value === '["1","0","1"]') ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });

  it('Input should fail when validating a non-primitive value when primitive property is enabled (default)', (done) => {
    const input = Input.create('input: bool');

    const value = new Boolean(true); // eslint-disable-line no-new-wrappers
    input.setValue(value);

    input.validate.bind(input)().then(() => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '5decf593-f5a2-4368-a675-9b47256c395a' ? null : err);
    });
  });

  it(`Input should allow validating a non primitive value when primitive property is disabled`, (done) => {
    const input = Input.create('input: bool', {primitive: false});

    const value = new Boolean(true); // eslint-disable-line no-new-wrappers
    input.setValue(value);

    input.validate.bind(input)().then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
