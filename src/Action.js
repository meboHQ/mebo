const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Utils = require('./Utils');
const Settings = require('./Settings');
const Session = require('./Session');
const Input = require('./Input');
const Metadata = require('./Metadata');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _inputs = Symbol('inputs');
const _session = Symbol('session');
const _metadata = Symbol('metadata');

class InvalidActionError extends Error{
}


/**
 * An action is used to perform an evaluation.
 *
 * By implementing an evaluation through an action, the evaluation is wrapped by an
 * agnostic interface which can be triggered through different domains ({@link Handler}).
 *
 * The data used to perform an evaluation is held by inputs ({@link Action.createInput}).
 * These inputs can be widely configured to enforce quality control via properties.
 * The available properties can be found under the documentation for each input type.
 *
 * ```
 * class HelloWorld extends Mebo.Action{
 *   constructor(){
 *     super();
 *     this.createInput('repeat: numeric', {max: 100}); <- input
 *   }
 *
 *   async _perform(data){
 *     return 'HelloWorld '.repeat(data.repeat);
 *   }
 * }
 *
 * const action = new HelloWorld();
 * action.input('repeat').setValue(3);
 * action.run().then(...) //  HelloWorld HelloWorld HelloWorld
 * ```
 *
 * An action is triggered through {@link Action.run} which internally calls
 * {@link Action._perform}. Use `_perform` to implement the evaluation of your action.
 * Also, you can implement {@link Action._finalize} to execute secondary routines.
 *
 * Make sure actions are always created through the factory function create
 * ({@link Action.create}). For that you need to register the action
 * that can be done in two ways:
 *
 * Decorator support:
 * ```
 * @Mebo.register('helloWorld') // <- registering action
 * class HelloWorld extends Mebo.Action{
 *   constructor(){
 *     super();
 *     this.createInput('repeat: numeric', {max: 100});
 *   }
 *
 *   async _perform(data){
 *     return 'HelloWorld '.repeat(data.repeat);
 *   }
 * }
 *
 * const action = Mebo.Action.create('helloWorld');
 * action.input('repeat').setValue(3);
 * action.run().then(...) //  HelloWorld HelloWorld HelloWorld
 * ```
 *
 * Registration api ({@link Action.register}):
 * ```
 * class HelloWorld extends Mebo.Action{
 *   constructor(){
 *     super();
 *     this.createInput('repeat: numeric', {max: 100});
 *   }
 *
 *   async _perform(data){
 *     return 'HelloWorld '.repeat(data.repeat);
 *   }
 * }
 *
 * Mebo.Action.register(HelloWorld, 'helloWorld'); // <- registering action
 *
 * const action = Mebo.Action.create('helloWorld');
 * action.input('repeat').setValue(3);
 * action.run().then(...) //  HelloWorld HelloWorld HelloWorld
 * ```
 *
 * In case you have an action that may need to call another actions during
 * `_perform`, it can be done through:
 *
 * - {@link Action.createAction} - allows actions to be created from inside of another action.
 * By doing that it creates an action that shares the same {@link Session}.
 *
 * ```
 * class HelloWorld extends Mebo.Action{
 *   // ...
 *   async _perform(data){
 *     const fooAction = this.createAction('foo');
 *     const fooResult = await fooAction.run();
 *     // ...
 *   }
 * }
 * // ...
 * ```
 *
 * - {@link Action.create} - factory an action with using a specific session when supplied
 * otherwise, creates an action with a new session.
 *
 * ```
 * class HelloWorld extends Mebo.Action{
 *   // ...
 *   async _perform(data){
 *     // in case you are planning to share the same session please
 *     // use the "sugary" `this.createAction` instead.
 *     const fooAction = Mebo.Action.create('foo');
 *     const fooResult = await fooAction.run();
 *     // ...
 *   }
 * }
 * // ...
 * ```
 *
 * Also, actions can take advantage of the caching mechanism designed to improve the performance
 * by avoiding re-evaluations in actions that might be executed multiple times. This can enabled
 * through {@link Action.isCacheable}.
 */
class Action{

  /**
   * creates an action
   */
  constructor(){
    this[_inputs] = new Map();
    this[_metadata] = new Metadata();
  }

  /**
   * Creates a new input through {@link Input.create} then adds it
   * to the action inputs {@link Action.addInput}
   *
   * @param {string} inputInterface - string followed by either the pattern `name: type`
   * or `name?: type` in case of optional {@link Input}
   * @param {...*} args - arguments passed to the input's constructor
   * @return {Input} Returns the created input instance
   */
  createInput(inputInterface, ...args){
    const inputInstance = Input.create(inputInterface, ...args);
    this.addInput(inputInstance);

    return inputInstance;
  }

  /**
   * Adds an {@link Input} instance to the action
   *
   * @param {Input} inputInstance - input that should be added to the action
   */
  addInput(inputInstance){
    // making sure the input is derived from Inputs
    assert(inputInstance instanceof Input, 'Invalid Input Type!');

    // making sure the new input name is not in use
    const inputName = inputInstance.name();
    if (this[_inputs].has(inputName)){
      throw new Error('Input name is already in use!');
    }

    this[_inputs].set(inputName, inputInstance);
  }

  /**
   * Returns the action input names
   *
   * @return {Array<string>}
   */
  inputNames(){
    return [...this[_inputs].keys()];
  }

  /**
   * Returns the input instance based on the given name
   *
   * @param {string} inputName - name of the input
   * @param {*} [defaultValue] - default value that is returned in case the
   * input does not exist
   * @return {Input}
   */
  input(inputName, defaultValue=null){
    assert(TypeCheck.isString(inputName), 'inputName needs to be defined as string!');

    if (this[_inputs].has(inputName)){
      return this[_inputs].get(inputName);
    }

    return defaultValue;
  }

  /**
   * Runs the validations of all inputs
   *
   * @return {Promise}
   */
  validate(){
    return Promise.all([...this[_inputs].values()].map(input => input.validate()));
  }

  /**
  * Returns a boolean telling if the action is cacheable (`false` by default).
  *
  * This method should be overridden by derived classes to tell if the action
  * is cacheable. This information is used by {@link Action.run}.
  *
  * The configuration about the LRU cache can be found under the {@link Session}.
  *
  * @return {boolean}
  */
  isCacheable(){
    return false;
  }

  /**
   * Executes the action and returns the result through a promise
   *
   * @param {boolean} [useCache=true] - tells if the action should try to use the LRU
   * cache to avoid the execution. This option is only used when the action is {@link Action.isCacheable}
   * @return {Promise<*>}
   */
  async run(useCache=true){

    // in case the result cache does not exist yet, creating it as an arbitrary
    // data under the session, therefore when the session is cloned by nested
    // actions this cache will be shared across them
    let resultCache = this.session().get('_actionResultCache');
    if (!resultCache){
      resultCache = new Utils.LruCache(
        Settings.get('action/lruCacheSize'),
        Settings.get('action/lruCacheLifespan') * 1000,
      );
      this.session().set('_actionResultCache', resultCache);
    }

    // pulling out result from the cache (if applicable)
    let actionSignature = null;
    if (useCache && this.isCacheable()){

      actionSignature = await this.id();

      // checking if the input hash is under the cache
      if (resultCache.has(actionSignature)){
        return resultCache.get(actionSignature);
      }
    }

    // the action is performed inside of a try/catch block to call the _finalize
    // no matter what, since that can be used to perform clean-up operations...
    let result = null;
    let err = null;
    try{
      // calling super class validations & executing action
      result = await this._execute();
    }
    catch(errr){
      err = this._processError(errr);
      throw err;
    }
    // running the finalize
    finally{
      await this._finalize(err, result);
    }

    // adding the result to the cache
    if (actionSignature){
      resultCache.set(actionSignature, result);
    }

    return result;
  }

  /**
   * Serializes the current interface of the action into json format. Serialized
   * actions can be recreated later through {@link Action.createFromJSON}
   * or in case of non-registered actions the baked information can be loaded
   * directly to an instance through {@link Action.fromJSON}.
   *
   * @param {boolean} [autofill=true] - tells if the {@link Session.autofill} will be
   * included in the serialization
   * @param {boolean} [avoidHidden=true] - tells if inputs with the 'hidden' property
   * should be ignored
   * @return {Promise<string>} serialized json version of the action
   */
  async bakeToJSON(autofill=true, avoidHidden=true){

    const actionInputs = await this._serializeInputs(avoidHidden);
    const session = this.session();

    // collecting autofill values
    const autofillData = {};
    if (autofill && session){
      for (const key of session.autofillKeys()){
        autofillData[key] = session.autofill(key);
      }
    }

    const result = {
      id: this.id(),
      inputs: actionInputs,
      metadata: {
        action: this.meta('action', {}),
      },
      session: {
        autofill: autofillData,
      },
    };

    return JSON.stringify(result, null, '\t');
  }

  /**
   * Loads the interface of the action from json (serialized through {@link Action.bakeToJSON}).
   *
   * @param {string} serializedAction - serialized json information generated by {@link Action.bakeToJSON}
   * @param {boolean} [autofill=true] - tells if the {@link Session.autofill} should
   * be loaded
   */
  fromJSON(serializedAction, autofill=true){

    const actionContents = JSON.parse(serializedAction);

    this._loadContents(actionContents, autofill);
  }

  /**
   * Returns an unique signature based on the action's current state. It's based
   * on the input types, input values and meta data information about the action.
   *
   * For a more reliable signature make sure that the action has been created through
   * the factory method ({@link Action.create}).
   *
   * @return {Promise<string>}
   */
  async id(){
    let actionSignature = '';
    const separator = ';\n';

    // header
    const actionRegisteredName = this.meta('action.name');
    if (actionRegisteredName){
      actionSignature = actionRegisteredName;
    }
    // using the class name can be very flawed, make sure to always creating actions
    // via their registration name
    else{
      actionSignature = `!${this.constructor.name}`;
    }
    actionSignature += separator;
    actionSignature += this.inputNames().length;
    actionSignature += separator;

    // contents
    const actionInputs = await this._serializeInputs(false);
    for (const inputName in actionInputs){
      actionSignature += `${inputName}: ${actionInputs[inputName]}${separator}`;
    }

    return Utils.hash(Buffer.from(actionSignature));
  }

  /**
   * Allows the creation of an action based on the current action. By doing this it passes
   * the current {@link Action.session} to the static create method ({@link Action.create}).
   * Therefore creating an action that shares the same session.
   *
   * @param {string} actionName - registered action name (case-insensitive)
   * @return {Action}
   */
  createAction(actionName){
    const action = Action.create(actionName, this.session());

    // overriding the metadata information about the origin of the action, by telling
    // it has been created from inside of another action
    action.setMeta('action.origin', 'nested');

    return action;
  }

  /**
   * Creates an action based on the registered action name, in case the action does
   * not exist `null` is returned instead
   *
   * @param {string} actionName - registered action name (case-insensitive)
   * @param {Session} [session] - optional custom session object
   * @return {Action}
   */
  static create(actionName, session=null){
    assert(TypeCheck.isString(actionName), 'Action name needs to be defined as string');

    const RegisteredAction = this.registeredAction(actionName);

    // creating action
    const action = new RegisteredAction();

    // setting session
    if (session){
      action.setSession(session);
    }

    // adding the action name used to create the action under the metadata
    action.setMeta('action.name', actionName.toLowerCase());

    // adding a metadata information telling the action is a top level one
    // it has not being created inside of another action through the
    // Action.createAction
    action.setMeta('action.origin', 'topLevel');

    return action;
  }

  /**
   * Creates an action based on the serialized input which is generated by
   * {@link Action.bakeToJSON}
   *
   * @param {string} serializedAction - json encoded action
   * @param {boolean} [autofill=true] - tells if the autofill information should be
   * loaded
   * @return {Action}
   */
  static createFromJSON(serializedAction, autofill=true){
    assert(TypeCheck.isString(serializedAction), 'serializedAction needs to be defined as string!');

    const actionContents = JSON.parse(serializedAction);
    const name = actionContents.metadata.action.name;

    assert(TypeCheck.isString(name), 'Could not find the action information');
    const action = this.create(name);

    assert(action, `Action not found: ${name}`);

    action._loadContents(actionContents, autofill);

    return action;
  }

  /**
   * Associates a {@link Session} with the action. By doing this all inputs that
   * are flagged with 'autofill' property will be initialized with the
   * session value. The session assigned to the action is cloned during the assignment
   * ({@link Session.clone}). A session is always assigned to an action,
   * during the factoring ({@link Action.create}).
   *
   * @param {Session} session - session object
   */
  setSession(session){
    assert(session instanceof Session, 'Invalid session!');

    this[_session] = session.clone();

    // setting the session inputs
    const autofillKeys = this[_session].autofillKeys();
    for (const inputName of this.inputNames()){

      const input = this.input(inputName);

      // setting the autofill inputs
      const autofillName = input.property('autofill');
      if (autofillName && autofillKeys.includes(autofillName)){
        input.setValue(this[_session].autofill(autofillName));
      }
    }
  }

  /**
   * Returns the session object
   *
   * @return {Session}
   */
  session(){

    // creating session on demanding
    if (!this[_session]){
      this[_session] = new Session();
    }

    return this[_session];
  }

  /**
   * Returns a value under the action's metadata.
   *
   * @param {string} path - path about where the value is localized (the levels
   * must be separated by '.'). In case of an empty string it returns the
   * entire metadata. The path can be defined using `option vars`
   * ({@link Metadata.optionVar}).
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  meta(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    return this[_metadata].value(path, defaultValue);
  }

  /**
   * Sets a value to the action's metadata.
   *
   * Detailed information about the metadata support can be found at
   * {@link Metadata}.
   *
   * @param {string} path - path about where the value should be stored under the metadata
   * (the levels must be separated by '.'). The path can be defined using `option vars`
   * ({@link Metadata.optionVar}).
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  setMeta(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    this[_metadata].setValue(path, value, merge);
  }

  /**
   * Registers an {@link Action} to the available actions
   *
   * In case you want to use a compound name with a prefix common across some group
   * of actions, you can use '.' as separator.
   *
   * @param {Action} actionClass - action implementation that will be registered
   * @param {string} name - string containing the registration name for the
   * action, this name is used later to create the action ({@link Action.create}).
   * In case of an empty string, the registration is done by using the name
   * of the type.
   */
  static register(actionClass, name){

    assert(TypeCheck.isSubClassOf(actionClass, Action), 'Invalid action type');
    assert(TypeCheck.isString(name), 'name needs to defined as string');
    assert(name.length, 'name cannot be empty');

    const nameFinal = name.toLowerCase();

    // validating name
    assert(nameFinal.length, 'action name cannot be empty');
    assert((/^([\w_\.\-])+$/gi).test(nameFinal), `Illegal action name: ${nameFinal}`); // eslint-disable-line no-useless-escape

    this._registeredActions.set(nameFinal, actionClass);
  }

  /**
   * Returns the action based on the registration name
   *
   * @param {string} name - name of the registered action
   * @return {Action}
   */
  static registeredAction(name){
    assert(TypeCheck.isString(name), 'Invalid name!');

    const normalizedName = name.toLowerCase();

    if (this._registeredActions.has(normalizedName)){
      return this._registeredActions.get(normalizedName);
    }

    throw new Error(`Action ${name} is not registered!`);
  }

  /**
   * Returns the registered action name based on the action class
   *
   * @param {Action} actionClass - action that should be used to query the
   * registered name
   * @return {string}
   */
  static registeredActionName(actionClass){
    assert(TypeCheck.isSubClassOf(actionClass, Action), 'Invalid action!');

    for (const [registeredName, registeredActionClass] of this._registeredActions.entries()){
      if (registeredActionClass === actionClass){
        return registeredName;
      }
    }

    throw new InvalidActionError(`There is no action registered for the class ${actionClass.name}!`);
  }

  /**
   * Returns a list containing the names of the registered actions
   *
   * @return {Array<string>}
   */
  static registeredActionNames(){
    return [...this._registeredActions.keys()];
  }

  /**
   * This method should be used to implement the evaluation of the action. It's called
   * by {@link Action.run} after all inputs have been validated. It's expected to return
   * a Promise containing the result of the evaluation.
   *
   * During the execution of the action all inputs are assigned as read-only ({@link Input.readOnly}),
   * this is done to prevent any modification in the input while the execution is happening,
   * by the end of the execution the inputs are assigned back with the read-only state
   * that was assigned before of the execution.
   *
   * *Result through a {@link Handler}:*
   *
   * The {@link Handler.output} is used for the serialization of a result. Therefore,
   * actions should not serialize the result by themselves; instead it should be
   * done by a handler. The handlers shipped with Mebo have support for streams
   * where in case of any readable stream or buffer value they are piped to the
   * output, otherwise the result is serialized using JSON.
   *
   * @param {Object} data - plain object containing the value of the inputs, this is just to
   * provide a more convenient way to query the value of the inputs inside of the
   * execution for instance: ```data.myInput``` instead of ```this.input('myInput').value()```.
   * @return {Promise<*>} value that should be returned by the action
   *
   * @abstract
   * @protected
   */
  async _perform(data){
    throw new Error('Not implemented error!');
  }

  /**
   * This method is called after the execution of the action.
   *
   * You could re-implement this method to:
   * - Add custom metadata information that can be used by a {@link Writer}
   * - Add arbitrary information to a log
   * - In case of errors to purge temporary files
   *
   * @param {Error|null} err - Error exception or null in case the action has
   * been successfully executed
   * @param {*} value - value returned by the action
   * @return {Promise} resolved promise (any result passed to the promise is ignored)
   *
   * @protected
   */
  async _finalize(err, value){
    return null;
  }

  /**
   * Executes the action and returns the result through a promise
   *
   * @return {Promise<*>}
   * @private
   */
  async _execute(){
    let result = null;

    const data = Object.create(null);
    const readOnlyOriginalValues = new Map();

    // making inputs read-only during the execution, otherwise it would be very dangerous
    // since a modified input would not get validated until the next execution.
    // The original read-only value is restored in the end of the execution. Also,
    // this process collects the input values that are stored under 'data' which
    // is later passed as argument of _perform method, it's used as a more convenient
    // way to query the value of the inputs
    for (const name of this.inputNames()){

      const input = this.input(name);
      readOnlyOriginalValues.set(input, input.readOnly());

      // making input as readOnly
      input.setReadOnly(true);

      // input value
      data[name] = input.value();
    }

    // checking if the inputs are valid (it throws an exception in case an input fails)
    try{
      await this.validate();
    }
    finally{
      // restoring the read-only
      for (const [input, originalReadOnly] of readOnlyOriginalValues){
        input.setReadOnly(originalReadOnly);
      }
    }

    // the action is performed inside of a try/catch block to call the _finalize
    // no matter what, since that can be used to perform clean-up operations...
    try{
      // performing the action
      result = await this._perform(data);
    }
    finally{
      // restoring the read-only
      for (const [input, originalReadOnly] of readOnlyOriginalValues){
        input.setReadOnly(originalReadOnly);
      }
    }

    return result;
  }

  /**
   * Auxiliary method used to the contents of the action
   *
   * @param {Object} actionContents - object created when a serialized action
   * is parsed
   * @param {boolean} autofill - tells if the {@link Session.autofill} should
   * be loaded
   * @private
   */
  _loadContents(actionContents, autofill){

    const session = this.session();
    if (autofill && session){
      for (const autofillKey in actionContents.session.autofill){
        session.setAutofill(autofillKey, actionContents.session.autofill[autofillKey]);
      }
    }

    for (const inputName in actionContents.inputs){
      const input = this.input(inputName);
      assert(input, `Invalid input ${inputName}`);

      input.parseValue(actionContents.inputs[inputName]);
    }
  }

  /**
   * Returns the value of the action inputs serialized
   *
   * @param {boolean} avoidHidden - tells if inputs with the 'hidden' property
   * should be ignored
   * @return {Promise<Object>}
   * @private
   */
  async _serializeInputs(avoidHidden){
    let inputNames = this.inputNames();

    // skipping hidden inputs
    if (avoidHidden){
      inputNames = inputNames.filter(x => !this.input(x).property('hidden', false));
    }

    const serializeValuePromises = inputNames.map(x => this.input(x).serializeValue());
    const serializedResult = await Promise.all(serializeValuePromises);

    const actionInputs = {};
    for (let i=0, len=inputNames.length; i < len; ++i){
      actionInputs[inputNames[i]] = serializedResult[i];
    }

    return actionInputs;
  }

  /**
   * Auxiliary method used to include additional information
   * to the exception raised during execution of the action
   *
   * @param {Error} err - exception that should be processed
   * @return {Error}
   * @private
   */
  _processError(err){

    // adding a member that tells the origin of the error
    let topLevel = false;
    if (!err.origin){
      err.origin = this.meta('action.origin');
      topLevel = true;

      // disabling output
      if (err.disableOutputInNested && err.origin === 'nested'){
        err.output = false;
      }
    }

    // adding the action class name and the registered name as a hint
    // to the stack (for debugging purposes)
    if (Object.getOwnPropertyDescriptor(err, 'stack').writable){
      let actionName = this.constructor.name;
      const registeredName = this.meta('action.name');
      if (registeredName){
        actionName += ` (${registeredName})`;
      }

      // including the action name information in a way that includes all action levels
      // aka: `/TopLevelAction (...)/NestedActionA (...)/NestedActionB (...):'
      if (topLevel){
        actionName += ':\n';
      }

      // including hint to the stack
      err.stack = `Oops, error on action /${actionName}${err.stack}`;
    }

    return err;
  }

  static _registeredActions = new Map();
}

// Setting the default settings:

// lruCacheSize
// Sets in bytes the size of the LRU cache available for the execution of actions.
// (default: `20 mb`)
Settings.set('action/lruCacheSize', 20 * 1012 * 1024);

// lruCacheLifespan
// Sets in seconds the amount of time that an item under LRU cache should
// be kept alive. This cache is defined by {@link Session.resultCache}
// (default: `10 seconds`)
Settings.set('action/lruCacheLifespan', 10);

module.exports = Action;
