const assert = require('assert');
const TypeCheck = require('js-typecheck');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _executionOrder = Symbol('executionOrder');


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
    this[_executionOrder] = [];
  }

  /**
   * Adds an action to the tasks
   *
   * `runOnlyOnce` can be used to avoid the execution of an action that may be triggered
   * multiple times across nested actions where ideally it should be executed only once,
   * it's done by using the action's id ({@link Action.id}).
   *
   * @param {Action} action - action instance that should be executed in the wrap up
   * @param {boolean} [runOnlyOnce=true] - tells if the action should be ignore in case
   * it has already been executed previously (it's done by matching the {@link Action.id})
   */
  addAction(action, runOnlyOnce=true){
    assert(TypeCheck.isCallable(action.execute), 'Invalid Action');

    this[_executionOrder].push({type: 'action', item: action, onlyOnce: runOnlyOnce});
  }

  /**
   * Adds a wrapped promise to the tasks
   *
   * @param {function} wrappedPromise - function that should return a promise, ex:
   * ```javascript
   * tasks.addWrappedPromise(() => Promise.resolve(3))
   * ```
   */
  addWrappedPromise(wrappedPromise){
    assert(TypeCheck.isCallable(wrappedPromise), 'Promise needs to wrapped into a function');

    this[_executionOrder].push({type: 'promise', item: wrappedPromise});
  }

  /**
   * Returns a list ordered by inclusion that contains the actions and
   * promises which are executed through {@link execute}
   *
   * @param {boolean} [actions=true] - tells if the result should return the actions
   * @param {boolean} [promises=true] - tells if the result should return the promises
   * @return {Promise<Array>}
   */
  async contents(actions=true, promises=true){
    const result = [];

    let resultIndex = 0;
    const actionIdMap = new Map();
    for (const task of this[_executionOrder]){
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

      if (alreadyIncluded && this[_executionOrder][actionIndex].onlyOnce){
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
    return this[_executionOrder].length === 0;
  }

  /**
   * Resets the tasks by cleaning all actions and promises
   *
   */
  clear(){
    this[_executionOrder].length = 0;
  }

  /**
   * Executes the actions and promises inside of the tasks (provided by {@link contents})
   *
   * @return {Promise<Array>} Returns an array containing each result of the tasks
   */
  async execute(){
    const contents = await this.contents();

    return Promise.all(contents.map((x) => {
      // promise
      if (TypeCheck.isCallable(x)){
        return x();
      }
      // action
      return x.execute();
    }));
  }
}

module.exports = Tasks;
