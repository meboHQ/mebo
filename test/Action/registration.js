const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../../src');
const testutils = require('../../testutils');

const Action = Mebo.Action;


describe('Action Registration:', () => {
  it('Should register an action with a valid name', () => {
    Action.register(testutils.Actions.Shared.Multiply, 'customActionName_.-1');
  });

  it('Should fail to register an action with invalid name', () => {

    let error = null;
    try{
      Mebo.Action.register(testutils.Actions.Shared.Multiply, 'customActionName$');
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
    Action.register(testutils.Actions.Shared.Multiply, 'customNewRegisteredAction');
    assert.equal(Action.registeredActionNames().length, currentValue.length + 1);

    // overriding the a registered a new action
    Action.register(testutils.Actions.Shared.Multiply, 'customNewRegisteredAction');
    assert.equal(Action.registeredActionNames().length, currentValue.length + 1);
  });

  it("Should raise an exception when can't find registered action name", () => {

    try{
      Mebo.Action.create('invalid_action_name');
    }
    catch(err){
      if (err.message !== 'Action invalid_action_name is not registered!'){
        throw err;
      }
    }
  });

  it("Should raise an exception when trying to get the action name based on a non-registered action", () => {
    class NonRegisteredMyActionTest extends Action{};

    try{
      Mebo.Action.registeredActionName(NonRegisteredMyActionTest);
    }
    catch(err){
      if (err.message !== 'There is no action registered for the class NonRegisteredMyActionTest!'){
        throw err;
      }
    }
  });
});
