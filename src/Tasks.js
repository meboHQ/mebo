const assert = require('assert');
const TypeCheck = require('js-typecheck');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _contents = Symbol('contents');
const _executedCount = Symbol('executedIndex');


/**
 * Object that holds actions and promises, which are executed at specific events.
 *
 * Inside Mebo tasks are used by the {@link Session.wrapup} to hold actions and
 * promises that are triggered when a {@link Session} is about to be terminated
 * ({@link Session.finalize}).
 */
class Tasks{

  /**
   * Creates a new instance
   */
  constructor(){
    this[_contents] = [];
    this[_executedCount] = 0;
  }

  /**
   * Adds an action to the tasks
   *
   * `runOnlyOnce` can be used to avoid the execution of an action that may be triggered
   * multiple times across nested actions where ideally it should be executed only once,
   * it's done by using the action's id ({@link Action.id}).
   *
   * @param {Action} action - action instance that should be executed in the wrap up
   * @param {Object} options - custom options
   * @param {boolean} [options.runOnlyOnce=true] - tells if the action should be ignore in case
   * it has already been executed previously (it's done by matching the {@link Action.id})
   * @param {number} [options.priority=100] - tells the priority of the action, this affects
   * the execution order where a lower numeric value means a higher priority.
   */
  addAction(action, {runOnlyOnce=true, priority=100}={}){
    assert(TypeCheck.isCallable(action.run), 'Invalid Action');

    this[_contents].push({
      type: 'action',
      item: action,
      onlyOnce: runOnlyOnce,
      execPriority: priority,
    });
  }

  /**
   * Adds a wrapped promise to the tasks
   *
   * @param {function} wrappedPromise - function that should return a promise, ex:
   * ```javascript
   * tasks.addWrappedPromise(() => Promise.resolve(3))
   * ```
   * @param {Object} options - custom options
   * @param {number} [options.priority=100] - tells the priority of the action, this affects
   * the execution order where a lower numeric value means a higher priority.
   */
  addWrappedPromise(wrappedPromise, {priority=100}={}){
    assert(TypeCheck.isCallable(wrappedPromise), 'Promise needs to wrapped into a function');

    this[_contents].push({
      type: 'promise',
      item: wrappedPromise,
      execPriority: priority,
    });
  }

  /**
   * Returns a list sorted by priority and inclusion order about the actions and
   * promises that are executed through {@link execute}
   *
   * @param {boolean} [actions=true] - tells if the result should return the actions
   * @param {boolean} [promises=true] - tells if the result should return the promises
   * @return {Promise<Array>}
   */
  async contents(actions=true, promises=true){
    const result = [];

    const taskOrder = this[_contents].map((data, index) => {
      return {
        i: index,
        contents: data,
      };
    });

    taskOrder.sort((a, b) => {
      if (a.contents.execPriority < b.contents.execPriority) return -1;
      if (a.contents.execPriority > b.contents.execPriority) return 1;
      return a.i - b.i;
    });

    const finalTaskOrder = taskOrder.map((x) => x.contents);

    let resultIndex = 0;
    const actionIdMap = new Map();
    for (const task of finalTaskOrder){
      // actions
      if (actions && task.type === 'action'){
        actionIdMap.set(resultIndex, task.item.id());
        result.push(task.item);
      }

      // promises
      else if (promises && task.type === 'promise'){
        result.push(task.item);
      }

      resultIndex++;
    }

    // the process bellow executes the ids in parallel and removes the duplicated
    // action id for any action marked as run onlyOnce from the final result
    const actionIndexes = Array.from(actionIdMap.keys());
    const actionIdResults = await Promise.all(actionIdMap.values());
    const alreadyAddedIds = [];

    let keyIndex = 0;
    let removedCount = 0;
    for (const actionIndex of actionIndexes){

      const actionId = actionIdResults[keyIndex];
      const alreadyIncluded = alreadyAddedIds.includes(actionId);

      if (alreadyIncluded && this[_contents][actionIndex].onlyOnce){
        result.splice(actionIndex - removedCount, 1);

        removedCount++;
      }
      else if (!alreadyIncluded){
        alreadyAddedIds.push(actionId);
      }

      keyIndex++;
    }

    return result;
  }

  /**
   * Tells if there are no tasks
   *
   * @return {boolean}
   */
  isEmpty(){
    return this[_contents].length === 0;
  }

  /**
   * Resets the tasks by cleaning all actions and promises
   *
   */
  clear(){
    this[_contents].length = 0;
    this[_executedCount] = 0;
  }

  /**
   * Executes the actions and promises inside of the tasks
   * (provided by {@link contents}). All tasks get executed even if an error occurs
   * during the execution of an specific task. In case this method is triggered
   * multiple times it ensures each task is only executed once.
   *
   * Failed tasks are reported through an exception raised after all tasks have been executed,
   * this error provides the `taskMeboErrors` member that contains a list about the errors raised
   * during the execution of the tasks.
   *
   * @return {Promise<Array>} Returns an array containing each result of the tasks
   */
  async run(){

    const contents = await this.contents();
    const taskMeboErrors = [];
    const result = [];

    let currentIndex = 0;
    for (const task of contents){

      // skipping tasks that have been executed previously
      currentIndex++;
      if (this[_executedCount] >= currentIndex){
        continue;
      }
      else{
        this[_executedCount]++;
      }

      // executing task
      try{
        result.push(
          await ((TypeCheck.isCallable(task)) ? task() : task.run()), // eslint-disable-line no-await-in-loop
        );
      }
      catch(err){
        taskMeboErrors.push(err);
      }

    }

    // throwing a new exception about the failed tasks
    if (taskMeboErrors.length){
      const error = new Error(`Failed to execute ${taskMeboErrors.length} tasks (out of ${contents.length})`);

      // including the stack trace information from the failed tasks (debugging purposes)
      for (const taskError of taskMeboErrors){
        error.stack += `\n\nTask stack trace:\n${taskError.stack}`;
      }

      // also, including the task errors to the error itself (debugging purposes)
      error.taskMeboErrors = taskMeboErrors;

      throw error;
    }

    return result;
  }
}

module.exports = Tasks;
