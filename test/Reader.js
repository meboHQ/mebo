const assert = require('assert');
const Mebo = require('../src');
const testutils = require('../testutils');

const Reader = Mebo.Reader;
const Session = Mebo.Session;


describe('Reader:', () => {

  class CustomReader extends Reader{
    constructor(action){
      super(action);

      this.setOption('defaultOption', 'test');
    }

    async _perform(inputList){
      const result = {};

      for (const input of inputList){
        result[input.name()] = input.value();
      }

      return result;
    }
  }

  it('Should test custom options defined to the writer', () => {

    const action = new testutils.Actions.Shared.PlainObjectResult();
    action.setSession(new Session());

    const reader = new CustomReader(action);
    // default option
    assert.equal(reader.setOption('defaultOption', 'test'));
  });

  it('Should parse the action input values', () => {
    return (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.setSession(new Session());

      action.input('a').setValue('text');
      action.input('b').setValue(20);

      const reader = new CustomReader(action);
      const inputValues = await reader.inputValues();

      // testing the result of the action
      assert.equal(inputValues.a, action.input('a').value());
      assert.equal(inputValues.b, action.input('b').value());

    })();
  });

  it('Should not replace a previous assigned value in the autofill', () => {
    return (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').assignProperty('autofill', 'text');
      action.input('b').assignProperty('autofill', 'number');
      action.setSession(new Session());
      action.session().setAutofill('text', 'keepIt');

      action.input('a').setValue('text');
      action.input('b').setValue(20);

      const reader = new CustomReader(action);

      const autofillValues = await reader.autofillValues();

      // testing the result of the action
      assert(!('text' in autofillValues));
      assert.equal(autofillValues.number, action.input('b').value());

    })();
  });

  it('Should fail to execute a non implemented reader', (done) => {
    (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.setSession(new Session());
      action.session().setAutofill('text', 'keepIt');

      action.input('a').setValue('text');
      action.input('b').setValue(20);

      const reader = new Reader(action);
      await reader.autofillValues();

    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done(err.message === 'Not implemented' ? null : err);
    });
  });
});
