const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../src');
const testutils = require('../../testutils');

const Action = Mebo.Action;


describe('Action Registration:', () => {
  it('Should register an action with a valid name', () => {
    Action.registerAction(testutils.Actions.Shared.Multiply, 'customActionName_.-1');
  });

  it('Should fail to register an action with invalid name', () => {

    let error = null;
    try{
      Mebo.registerAction(testutils.Actions.Shared.Multiply, 'customActionName$');
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'Illegal action name: *'))){
      throw error || new Error('Unexpected result');
    }
  });

  it('Should test the registered action names', () => {
    const currentValue = Action.registeredActionNames();

    // registering a new action
    Action.registerAction(testutils.Actions.Shared.Multiply, 'customNewRegisteredAction');
    assert.equal(Action.registeredActionNames().length, currentValue.length + 1);

    // overriding the a registered a new action
    Action.registerAction(testutils.Actions.Shared.Multiply, 'customNewRegisteredAction');
    assert.equal(Action.registeredActionNames().length, currentValue.length + 1);
  });

  it("Should return null when can't find registered action name", () => {
    assert.equal(Mebo.createAction('invalid_action_name'), null);
  });
});
