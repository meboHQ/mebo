const assert = require('assert');
const Mebo = require('../../src');
const testutils = require('../../testutils');

const ValidationFail = Mebo.Errors.ValidationFail;


describe('Action Input:', () => {

  @Mebo.register('multiplyAction')
  class MultiplyAction extends testutils.Actions.Shared.Multiply{
    constructor(){
      super();

      this.input('a').setValue(2);
      this.input('b').setValue(5);
      this.createInput('inputC: text', {required: false});
    }

    _perform(data){
      // used by the tests
      this.wasCalled = true;

      return super._perform(data);
    }
  }

  // input
  it('When querying an input that does not exist it should return defaultValue instead', () => {
    const multiplyAction = Mebo.Action.create('multiplyAction');
    assert.equal(multiplyAction.input('FooNotInAction', 'defaultValueA'), 'defaultValueA');
  });

  it('When querying an input that exists it should return the input object (not defaultValue)', () => {
    const multiplyAction = Mebo.Action.create('multiplyAction');
    assert.equal(multiplyAction.input('a', 'defaultValueA').value(), 2);
  });

  // input names
  it('When querying the input names it should return all inputs added to the action', () => {
    const multiplyAction = Mebo.Action.create('multiplyAction');
    assert.equal(multiplyAction.inputNames().filter(x => (['a', 'b'].includes(x))).length, 2);
  });

  it('Should fail when trying to add the same input name twice', () => {
    const multiplyActionAction = new MultiplyAction();
    multiplyActionAction.createInput('newInput: bool');

    let failed = false;
    try{
      multiplyActionAction.createInput('newInput: text');
    }
    catch(err){
      failed = true;
    }

    assert(failed);
  });

  it('When an input has an invalid value (validation has failed), it should carry the error exception through resultCallback', (done) => {
    const multiplyActionResult = new MultiplyAction();
    multiplyActionResult.createInput('customInput: bool', {defaultValue: false}, function customValidation(){
      return new Promise((resolve, reject) => {
        reject(new ValidationFail(this.name(), 'foo error'));
      });
    });

    multiplyActionResult.run().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err instanceof Error ? null : new Error('Invalid Instance Type'));
    });
  });
});
