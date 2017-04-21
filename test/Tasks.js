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
    Mebo.registerAction(testutils.Actions.Shared.Sum, 'tasksActionA');
    Mebo.registerAction(TasksActionB);
  });

  // tests
  it('Should avoid to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Mebo.createAction('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.addAction(actionA1);
      tasks.addAction(actionA1);

      const actionA2 = Mebo.createAction('tasksActionA');
      actionA2.input('a').setValue(12);
      actionA2.input('b').setValue(13);

      tasks.addAction(actionA2);
      tasks.addAction(actionA2);

      assert.equal((await tasks.contents()).length, 2);

      const actionB = Mebo.createAction('tasksActionB');
      actionB.input('a').setValue(12);
      actionB.input('b').setValue(10);
      actionB.input('c').setValue(10);

      tasks.addAction(actionB);
      tasks.addAction(actionB);

      assert.equal((await tasks.contents()).length, 3);

    })();
  });

  it('Should allow to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Mebo.createAction('tasksActionA');
      actionA1.input('a').setValue(10);
      actionA1.input('b').setValue(10);

      const tasks = new Tasks();
      tasks.addAction(actionA1);
      tasks.addAction(actionA1, false);

      assert.equal((await tasks.contents()).length, 2);
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

      const actionA = Mebo.createAction('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);

      tasks.addAction(actionA);
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

      const actionA = Mebo.createAction('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);
      tasks.addAction(actionA);

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

      const actionA = Mebo.createAction('tasksActionA');
      actionA.input('a').setValue(12);
      actionA.input('b').setValue(13);
      tasks.addAction(actionA);

      const result = await tasks.execute();

      assert.equal(result[0], 20);
      assert.equal(result[1], 25);

    })();
  });
});
