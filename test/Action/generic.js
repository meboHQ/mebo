const assert = require('assert');
const Mebo = require('../../src');
const testutils = require('../../testutils');

const Action = Mebo.Action;
const Session = Mebo.Session;


describe('Action Generic:', () => {

  // actions used by the tests
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

  class CacheableAction extends MultiplyAction{

    constructor(){
      super();
      this.counter = 0;
    }

    _perform(data){
      this.counter += 1;
      return super._perform(data);
    }

    isCacheable(){
      return true;
    }
  }

  before(() => {
    // registrations
    Mebo.registerAction(MultiplyAction);
    Mebo.registerAction(CacheableAction);
  });

  // execute
  it('Value received in resultCallback should match the one returned by _perform method', (done) => {

    const multiplyAction = Mebo.createAction('multiplyAction');
    multiplyAction.execute().then((value) => {

      let error = null;

      try{
        assert.equal(value, 10);
      }
      catch(err){
        error = err;
      }

      done(error);

    }).catch((err) => {
      done(err);
    });
  });

  it("LRU cache: should return the value from the cache when it's called multiple times with the same input configuration", () => {

    return (async () => {
      const cacheableAction = Mebo.createAction('cacheableAction');

      cacheableAction.input('a').setValue(2);
      cacheableAction.input('b').setValue(2);

      await cacheableAction.execute();
      await cacheableAction.execute();
      await cacheableAction.execute();

      assert.equal(cacheableAction.counter, 1);
    })();
  });

  it('Should let null to be assigned as session value', () => {
    const action = Mebo.createAction('cacheableAction');
    action.setSession(new Session());

    // replacing session to null
    action.setSession(null);

    assert.equal(action.session(), null);
  });

  it('LRU cache: Should return a different id when the input is set with a different value', () => {

    return (async () => {
      const cacheableAction = Mebo.createAction('cacheableAction');
      const cacheIdA = await cacheableAction.id();

      cacheableAction.input('a').setValue(1);

      assert.notEqual(cacheIdA, await cacheableAction.id());
    })();
  });

  it('LRU cache: Test the value returned from the cache', () => {

    return (async () => {
      const cacheableAction = Mebo.createAction('cacheableAction');
      cacheableAction.input('a').setValue(2);

      // asking twice for the same value (the second one returns from the cache)
      let result = await cacheableAction.execute();
      assert.equal(result, 10);

      let cacheResult = await cacheableAction.execute();
      assert.equal(result, cacheResult);

      // same test with a different value
      cacheableAction.input('a').setValue(1);

      result = await cacheableAction.execute();
      cacheResult = await cacheableAction.execute();

      assert.equal(result, cacheResult);

    })();
  });

  it('Should be able query the action id even when the action has not been created through the registration name', () => {
    const multiplyActionAction = new MultiplyAction();
    return multiplyActionAction.id();
  });

  it('Should raise an exception when _perform has not being implemented', (done) => {
    const action = new Action();

    action._perform().then((value) => {
      done(new Error('Should fail when _perform is not implemented!'));
    }).catch((err) => {
      done();
    });
  });

  it('Wrap up actions: Should testing if they are being triggered by the finalize', () => {

    return (async () => {

      const session = new Session();
      const wrapUpAction = Mebo.createAction('multiplyAction');

      wrapUpAction.input('a').setValue(2);
      wrapUpAction.input('b').setValue(2);
      session.wrapup().addAction(wrapUpAction);

      let wrapupPromiseWasCalled = false;

      session.wrapup().addWrappedPromise(() => {
        return new Promise((resolve, reject) => {
          wrapupPromiseWasCalled = true;
          resolve(true);
        });
      });

      await session.finalize();
      assert(wrapUpAction.wasCalled);
      assert(wrapupPromiseWasCalled);

      // it should raise an exception when trying to finalize the session again
      let failed = false;
      try{
        await session.finalize();
      }
      catch(err){
        failed = true;
      }

      if (!failed){
        throw new Error('It should have failed when finalize is triggered multiple times');
      }
    })();
  });

  it('Should clone session during session assignment', () => {
    const session = new Session();
    const action = new Action();
    action.setSession(session);

    assert.notEqual(action.session(), session);
  });
});
