const assert = require('assert');
const Mebo = require('../../../src');

const Input = Mebo.Input;


describe('Text Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: text');
    assert.equal(input.value(), null);
  });

  it('Should create the input using the alias: string', () => {
    const input = Input.create('input: string');
    assert(input instanceof Mebo.Ext.Inputs.Text);
  });

  it('Integer should not be considered as text', (done) => {
    const input = Input.create('input: text');
    input.setValue(1);
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454' ? null : err);
    });
  });

  it('String value should be valid', () => {
    const input = Input.create('input: text');
    input.setValue('value');
    return input.validate.bind(input)();
  });

  it('Should parse a vector value from JSON', () => {
    const input = Input.create('input: text[]');
    const data = ['a', null, ''];

    input.parseValue(JSON.stringify(data));

    assert.equal(input.value()[0], 'a');
    assert.equal(input.value()[1], null);
    assert.equal(input.value()[2], null);
  });

  it('Should accept a string array', () => {
    const input = Input.create('input: text[]');
    input.setValue(['a', 'b', 'c']);

    return input.validate.bind(input)();
  });

  it('Should fail when the array contains a non string value', (done) => {
    const input = Input.create('input: text[]');
    input.setValue(['a', 2, 'c']);

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454') ? null : err);
    });
  });

  it('Should fail to serialize', (done) => {
    const input = Input.create('input: text[]');
    input.setValue(['a', 2, 'c']);

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454') ? null : err);
    });
  });

  it("When 'min' property is set, it should not allow strings shorter than the minimum", (done) => {
    const input = Input.create('input: text', {min: 4});
    input.setValue('foo');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '64358b78-ec83-4494-b734-0b1bdac43720') ? null : err);
    });
  });

  it("When 'max' property is set, it should not allow strings longer than the maximum", (done) => {
    const input = Input.create('input: text', {max: 2});
    input.setValue('foo');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === 'c7ff4423-2c27-4538-acd7-923dada7f4d3') ? null : err);
    });
  });
});
