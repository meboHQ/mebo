const assert = require('assert');
const Mebo = require('../../../src');

const BaseText = Mebo.Ext.Inputs.BaseText;


describe('BaseText Input:', () => {

  it('Input should start empty', () => {

    const input = new BaseText('input');
    assert.equal(input.value(), null);
  });

  it('String value should be valid', () => {

    const input = new BaseText('input');
    input.setValue('value');
    return input.validate.bind(input)();
  });

  it('Number value should not be valid', (done) => {
    const input = new BaseText('input');
    input.setValue(1);
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it("An empty string assigned as value should be considered as empty when calling 'isEmpty'", () => {
    const input = new BaseText('input');
    input.setValue('');
    assert(input.isEmpty());
  });

  it("When 'regex' property is set, it should validate date based on a regex pattern", () => {

    const input = new BaseText('input', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.setValue('25/05/1984');
    return input.validate.bind(input)();
  });

  it("When 'regex' property is set, it should not validate the input with a wrong date format based on a regex pattern", (done) => {

    const input = new BaseText('input', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.setValue('AA/05/1984');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === 'c902610c-ef17-4a10-bc75-887d1550793a' ? null : err);
    });
  });

  it('Input should fail when validating a non-primitive value when primitive property is enabled (default)', (done) => {

    const input = new BaseText('input');
    const value = new String('text'); // eslint-disable-line no-new-wrappers
    input.setValue(value);

    input.validate.bind(input)().then(() => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '81b44982-3c7b-4a25-952b-70ec640c58d4' ? null : err);
    });
  });

  it(`Input should allow validating a non primitive value when primitive property is disabled`, (done) => {

    const input = new BaseText('input', {primitive: false});
    const value = new String('text'); // eslint-disable-line no-new-wrappers
    input.setValue(value);

    input.validate.bind(input)().then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
