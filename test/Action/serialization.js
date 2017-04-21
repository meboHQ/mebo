const assert = require('assert');
const Mebo = require('../../src');
const testutils = require('../../testutils');

const Action = Mebo.Action;
const Session = Mebo.Session;

describe('Action Serialization:', () => {

  before(() => {
    // registrations
    Mebo.registerAction(testutils.Actions.Shared.Multiply, 'multiplyAction');
  });

  // tests
  it('Should serialize action into json', () => {

    return (async () => {
      const actionA = Mebo.createAction('multiplyAction');
      actionA.input('a').setValue(3);
      actionA.input('b').setValue(4);

      const actionB = Action.createFromJSON(await actionA.bakeToJSON());

      assert.equal(actionA.metadata('action.name'), actionB.metadata('action.name'));
      assert.equal(actionA.input('a').value(), actionB.input('a').value());
      assert.equal(actionA.input('b').value(), actionB.input('b').value());
      assert.equal(await actionA.id(), await actionB.id());

    })();
  });

  it('Should fail to serialize action that contains a non-serializable input', () => {

    class NonSerializable extends testutils.Actions.Shared.Multiply{
      constructor(){
        super();
        this.createInput('nonSerializable: any', {hidden: false});
      }
    }
    Mebo.registerAction(NonSerializable);

    return (async () => {
      const action = Mebo.createAction('NonSerializable');
      action.input('a').setValue(3);
      action.input('b').setValue(4);
      action.input('nonSerializable').setValue({a: 1});

      let success = false;
      try{
        await action.bakeToJSON();
      }
      catch(err){
        if (err.message === 'serialization not supported!'){
          success = true;
        }
        else{
          throw err;
        }
      }

      if (!success){
        throw new Error("Can't serialize an action that contains non-serializable inputs");
      }
    })();
  });

  it('Should serialize action into json with hidden inputs when avoidHidden is false', () => {

    return (async () => {
      const actionA = Mebo.createAction('multiplyAction', new Session());
      actionA.input('a').setValue(4);
      actionA.input('b').setValue(5);
      actionA.input('b').assignProperty('hidden', true);

      const actionB = Action.createFromJSON(await actionA.bakeToJSON(true, false));

      assert.equal(actionA.input('a').value(), actionB.input('a').value());
      assert.equal(actionA.input('b').value(), actionB.input('b').value());
    })();
  });

  it('Should serialize action into json without hidden inputs when avoidHidden is true (default)', () => {

    return (async () => {
      const actionA = Mebo.createAction('multiplyAction', new Session());
      actionA.input('a').setValue(4);
      actionA.input('b').setValue(5);
      actionA.input('b').assignProperty('hidden', true);

      const actionB = Action.createFromJSON(await actionA.bakeToJSON());

      assert.equal(actionA.input('a').value(), actionB.input('a').value());
      assert(actionB.input('b').isEmpty());
    })();
  });

  it('Should serialize action into json with autofill values', () => {

    return (async () => {
      const actionA = Mebo.createAction('multiplyAction', new Session());
      actionA.session().setAutofill('test', 10);
      actionA.session().setAutofill('test2', 1);
      actionA.input('a').setValue(4);
      actionA.input('b').setValue(4);

      const actionB = Action.createFromJSON(await actionA.bakeToJSON());

      assert.equal(actionA.session().autofill('test'), actionB.session().autofill('test'));
      assert.equal(actionA.session().autofill('test2'), actionB.session().autofill('test2'));
    })();
  });

  it('Should serialize action contents into json testing the input values', () => {

    return (async () => {
      const actionA = new testutils.Actions.Shared.Multiply();
      actionA.input('a').setValue(3);
      actionA.input('b').setValue(4);

      const actionB = new testutils.Actions.Shared.Multiply();
      actionB.fromJSON(await actionA.bakeToJSON(false));

      assert.equal(actionA.input('a').value(), actionB.input('a').value());
      assert.equal(actionA.input('b').value(), actionB.input('b').value());
      assert.equal(await actionA.id(), await actionB.id());
    })();
  });

  it('Should serialize action contents into json testing the autofill', () => {

    return (async () => {
      const actionA = new testutils.Actions.Shared.Multiply();
      actionA.setSession(new Session());
      actionA.session().setAutofill('customValue', 'test');
      actionA.session().setAutofill('customValue2', 'test2');
      actionA.input('a').setValue(3);
      actionA.input('b').setValue(4);

      const actionB = new testutils.Actions.Shared.Multiply();
      actionB.setSession(new Session());
      actionB.fromJSON(await actionA.bakeToJSON());

      assert.equal(actionA.session().autofill('customValue'), actionB.session().autofill('customValue'));
      assert.equal(actionA.session().autofill('customValue2'), actionB.session().autofill('customValue2'));
    })();
  });

  it('Should serialize action into json without autofill values (disabled during serialization)', () => {

    return (async () => {
      const actionA = Mebo.createAction('multiplyAction', new Session());
      actionA.session().setAutofill('test', 10);
      actionA.session().setAutofill('test2', 1);
      actionA.input('a').setValue(4);
      actionA.input('b').setValue(4);

      const actionB = Action.createFromJSON(await actionA.bakeToJSON(false));

      assert.equal(actionB.session().autofill('test'), undefined);
      assert.equal(actionB.session().autofill('test2'), undefined);
    })();
  });
});
