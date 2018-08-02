const assert = require('assert');
const Mebo = require('../src');
const testutils = require('../testutils');

const Tasks = Mebo.Tasks;


describe('Tasks:', () => {

  class TasksActionB extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.createInput('c: numeric');
    }

    _perform(data){
      return Promise.resolve(data.a + data.b + data.c);
    }
  }

  before(() => {
    // registrations
    Mebo.Action.register(testutils.Actions.Shared.Sum, 'tasksActionA');
    Mebo.Action.register(TasksActionB, 'tasksActionB');
  });

  // tests
  it('Should avoid to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Mebo.Action.create('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.grantAction(actionA1);
      tasks.grantAction(actionA1);

      const actionA2 = Mebo.Action.create('tasksActionA');
      actionA2.input('a').setValue(12);
      actionA2.input('b').setValue(13);

      tasks.grantAction(actionA2);
      tasks.grantAction(actionA2);

      assert.equal((await tasks.contents()).length, 2);

      const actionB = Mebo.Action.create('tasksActionB');
      actionB.input('a').setValue(12);
      actionB.input('b').setValue(10);
      actionB.input('c').setValue(10);

      tasks.grantAction(actionB);
      tasks.grantAction(actionB);

      assert.equal((await tasks.contents()).length, 3);

    })();
  });

  it('Should allow to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Mebo.Action.create('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.grantAction(actionA1);
      tasks.grantAction(actionA1, {runOnlyOnce: false});

      assert.equal((await tasks.contents()).length, 2);
    })();
  });

  it('Should test the execution priority', () => {

    return (async () => {
      const actionA1 = Mebo.Action.create('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.grantAction(actionA1, {priority: 5});

      const actionA2 = Mebo.Action.create('tasksActionA');
      actionA2.input('a').setValue(12);
      actionA2.input('b').setValue(13);
      tasks.grantAction(actionA2, {priority: 10});

      const actionB = Mebo.Action.create('tasksActionB');
      actionB.input('a').setValue(12);
      actionB.input('b').setValue(10);
      actionB.input('c').setValue(10);
      tasks.grantAction(actionB, {priority: 1});

      const contents = await tasks.contents();
      assert.equal(contents.length, 3);
      assert.equal(contents[0], actionB);
      assert.equal(contents[1], actionA1);
      assert.equal(contents[2], actionA2);

    })();
  });

  it('Should test the default execution priority (100)', () => {

    return (async () => {
      const actionA1 = Mebo.Action.create('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.grantAction(actionA1, {priority: 101});

      const actionDefaultPriority = Mebo.Action.create('tasksActionA');
      actionDefaultPriority.input('a').setValue(12);
      actionDefaultPriority.input('b').setValue(13);
      tasks.grantAction(actionDefaultPriority);

      const actionB = Mebo.Action.create('tasksActionB');
      actionB.input('a').setValue(12);
      actionB.input('b').setValue(10);
      actionB.input('c').setValue(10);
      tasks.grantAction(actionB, {priority: 99});

      const contents = await tasks.contents();
      assert.equal(contents.length, 3);
      assert.equal(contents[0], actionB);
      assert.equal(contents[1], actionDefaultPriority);
      assert.equal(contents[2], actionA1);

    })();
  });

  it('Should let arbitrary promises to be added to the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await tasks.contents()).length, 1);

      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await tasks.contents()).length, 2);

    })();
  });

  it('Should clear the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });

      const actionA = Mebo.Action.create('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);

      tasks.grantAction(actionA);
      assert.equal((await tasks.contents()).length, 2);

      tasks.clear();
      assert.equal((await tasks.contents()).length, 0);
      assert(tasks.isEmpty());

    })();
  });

  it('Should return the contents of the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      const wrappedPromise = () => {
        return Promise.resolve(true);
      };
      tasks.addWrappedPromise(wrappedPromise);

      const actionA = Mebo.Action.create('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);
      tasks.grantAction(actionA);

      assert.equal((await tasks.contents()).length, 2);

      assert.equal((await tasks.contents(false)).length, 1);
      assert.equal((await tasks.contents(false))[0], wrappedPromise);

      assert.equal((await tasks.contents(true, false)).length, 1);
      assert.equal((await tasks.contents(true, false))[0], actionA);
    })();
  });

  it('Should execute the tasks', () => {

    return (async () => {

      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(20);
      });

      const actionA = Mebo.Action.create('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);
      tasks.grantAction(actionA);

      const result = await tasks.run();

      assert.equal(result[0], 20);
      assert.equal(result[1], 25);

    })();
  });
});
