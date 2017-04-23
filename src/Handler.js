const assert = require('assert');
const EventEmitter = require('events');
const TypeCheck = require('js-typecheck');
const minimatch = require('minimatch');
const Session = require('./Session');
const Action = require('./Action');
const Metadata = require('./Metadata');
const Reader = require('./Reader');
const Writer = require('./Writer');
const Util = require('./Util');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _session = Symbol('session');
const _metadata = Symbol('metadata');


/**
 * A handler is used to bridge an execution method to Mebo.
 *
 * The data used by the handler is parsed through a {@link Reader}. This data
 * is then loaded to the action during the execution time through
 * {@link Handler.execute}.
 *
 * The result of a handler is done through a {@link Writer}. Writers are designed
 * to support reporting a success output and an error output as well. The way the
 * result is serialized is determined by the writer implementation
 * ({@link Writer._successOutput}, {@link Writer._errorOutput}). All writers
 * shipped with Mebo have support for streams where in case of any readable stream
 * or buffer value they are piped to the output, otherwise the result is encoded
 * using JSON.
 *
 * Both reader and writer can be customized through options that can be either
 * defined through the action's metadata or directly through the handler. If you would
 * like to know more about the available options check out the respective
 * {@link Reader} & {@link Writer} documentation for the handler implementation
 * you are interested.
 *
 * Defining options through actions (detailed information can be found at
 * {@link Metadata}):
 * ```
 * class MyAction extends Mebo.Action{
 *    constructor(){
 *      super();
 *
 *      // change 'name' for the registration name of the handler you
 *      // want to define the read & write options
 *      this.setMetadata('handler.name', {
 *        readOptions: {
 *          someReadOption: true,
 *        },
 *        writeOptions: {
 *          someWriteOption: 10,
 *        },
 *      });
 *    }
 * }
 * Mebo.registerAction(MyAction);
 * ```
 *
 * Defining options directly through the handler:
 * ```
 * // read options
 * myHandler.execute('myAction', {
 *  someReadOption: true,
 * })
 *
 * // write options
 * myHandler.output(value, {
 *  someWriteOption: 10,
 * })
 * ```
 *
 * Handlers are created by their registration name ({@link Handler.registerHandler}),
 * the creation is done by {@link Handler.create} or `Mebo.createHandler`:
 *
 * ```
 * // creating a handle based on the handler registration name
 * const handler = Mebo.createHandler('myHandler');
 *
 * // loading the parsed information to the action
 * handler.execute('actionName').then((result) => {
 *
 *    // success output
 *    handler.output(result);
 *
 * // error output
 * }).catch((err) => {
 *    handler.output(err);
 * });
 * ```
 *
 * **Tip:** You can set the env variable `NODE_ENV=development` to get the
 * traceback information included in the error output.
 */
class Handler{

  /**
   * Creates a Handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    assert(session instanceof Session, 'Invalid session');

    this[_session] = session;
    this[_metadata] = new Metadata();
  }

  /**
   * Returns the session
   *
   * @return {Session}
   */
  session(){
    return this[_session];
  }

  /**
   * Returns a value under the handler's metadata.
   *
   * @param {string} path - path about where the value is localized (the levels
   * must be separated by '.'). In case of an empty string it returns the
   * entire metadata. The path can be defined using `path vars`
   * ({@link Metadata.optionVar}).
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  metadata(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    return this[_metadata].value(path, defaultValue);
  }

  /**
   * Sets a value to the handler's metadata.
   *
   * Detailed information about the metadata support can be found at
   * {@link Metadata}.
   *
   * @param {string} path - path about where the value should be stored under the metadata
   * (the levels must be separated by '.'). The path can be defined using `path vars`
   * ({@link Metadata.optionVar}).
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  setMetadata(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    this[_metadata].setValue(path, value, merge);
  }

  /**
   * Executes an action through the handler.
   *
   * This process is done by creating an action that loads the information
   * parsed by the {@link Reader}.
   *
   * After the construction of the action it looks for reading options that can
   * be defined as part of the action's metadata ({@link Action.metadata}) and
   * when found they are passed to the reader. After the execution of the action
   * it looks again inside of the action's metadata for writing options, which
   * are later used during the output ({@link Handler.output}). To know how
   * to define action's metadata for the handler take a look at the initial
   * documentation about the {@link Handler}.
   *
   * @param {string} actionName - registered action name that should be executed
   * @param {Object} options - plain object containing the options that is passed
   * to the {@link Reader}.
   * for the handler should be fetched.
   * @return {*} result of the action
   */
  async execute(actionName, options={}){

    const action = Action.create(actionName, this.session());
    assert(action, `Action ${actionName} not found!`);

    // collecting read options from the action
    let actionHandlerName = this._actionHandlerName(action);

    if (actionHandlerName){
      this.setMetadata(
        'readOptions',
        action.metadata(`handler.${actionHandlerName}.readOptions`, {}),
      );
    }

    // executing action
    let result;
    await this._load(action, options);
    try{
      result = await action.execute();
    }
    finally{

      // handler metadata can be defined later during
      // for this reason querying it again if it was not defined previously
      if (!actionHandlerName){
        actionHandlerName = this._actionHandlerName(action);
      }

      // collecting write options from the action
      if (actionHandlerName){
        this.setMetadata(
          'writeOptions',
          action.metadata(`handler.${actionHandlerName}.writeOptions`, {}),
        );
      }
    }

    return result;
  }

  /**
   * Results a value through the handler.
   *
   * In case the value is an exception then it's treated as {@link Writer._errorOutput}
   * otherwise the value is treated as {@link Writer._successOutput}.
   *
   * When an action is executed through the handler ({@link Handler.execute})
   * it can define writing options that are used by the output. These
   * options are stored under the {@link Handler.metadata} where any options passed
   * directly to the output method override them.
   *
   * If `finalizeSession` is enabled (default) the {@link Handler.session} gets finalized
   * in the end of the output process.
   *
   * In case of any error raised inside of the output process the handler emits the signal
   * {@link Handler.onErrorDuringOutput}. Errors passed as output are able to drive
   * the output behavior by having the member `output` defined, further information
   * can be found at the write error output documentation ({@link Writer._errorOutput}).
   *
   * @param {*} value - raw value that should be resulted by the handler
   * @param {Object} [options] - plain object containing options that should be used
   * by the output where each handler implementation contains their own set of options.
   * @param {boolean} [finalizeSession=true] - tells if it should finalize the session
   * ({@link Session.finalize})
   */
  output(value, options={}, finalizeSession=true){

    const writeOptions = Util.deepMerge(this.metadata('writeOptions', {}), options);
    const writer = this._createWriter(value, writeOptions);
    try{
      writer.serialize();
    }
    catch(err){
      this._emitOutputError(err);
    }

    // the session finalization runs in parallel, since it does secondary tasks
    // (such as clean-up, logging, etc...) there is no need to await for that
    if (finalizeSession){
      this.session().finalize().then().catch((err) => {
        this._emitOutputError(err);
      });
    }
  }

  /**
   * Creates a handler based on the registered name
   *
   * Alternatively this method can be called directly from Mebo as `Mebo.createHandler(...)`
   *
   * Also, the handler name gets included in the session as arbitrary data, it can be
   * retrieved through 'handler'. This name follows the registration pattern where this
   * value is represented in lowercase internally:
   * ```
   * Session.get('handler');
   * ```
   * @param {string} handlerName - registered handler name
   * @param {string} [mask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   * @param {Session} [session] - session used by the handler, if not specified it creates
   * a new session instance
   * @return {Handler}
   */
  static create(handlerName, mask='*', session=new Session()){
    const HandlerClass = this.registeredHandler(handlerName, mask);

    // creates a new instance
    if (!HandlerClass){
      throw new Error(`Execution Handler: ${handlerName}, is not registered!`);
    }

    const handler = new HandlerClass(session);

    // adding the handler name used to factory the handler under the metadata
    const normalizedHandlerName = handlerName.toLowerCase();
    handler.setMetadata('handler.name', normalizedHandlerName);
    handler.setMetadata('handler.mask', mask.toLowerCase());

    // also, adding the handler name under the session arbitrary data
    session.set('handler', normalizedHandlerName);

    return handler;
  }

  /**
   * Register an {@link Handler} type to the available handlers
   *
   * @param {Handler} handlerClass - handler implementation that will be registered
   * @param {string} [handlerName] - string containing the registration name for the
   * handler. In case of an empty string, the registration is done by using the name
   * of the type (this information is stored in lowercase)
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   */
  static registerHandler(handlerClass, handlerName='', handlerMask='*'){
    assert(TypeCheck.isSubClassOf(handlerClass, Handler), 'Invalid handler type!');
    const handlerNameFinal = ((handlerName === '') ? handlerClass.name : handlerName);

    this._register(this._registeredHandlers, handlerClass, handlerNameFinal, handlerMask);
  }

  /**
   * Register a {@link Reader} for the handler
   *
   * @param {Reader} readerClass - reader class
   * @param {string} handlerName - registered handler name
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   */
  static registerReader(readerClass, handlerName, handlerMask='*'){
    assert(TypeCheck.isSubClassOf(readerClass, Reader), 'Invalid reader type');

    this._register(this._registeredReaders, readerClass, handlerName, handlerMask);
  }

  /**
   * Register a {@link Writer} for the handler
   *
   * @param {Writer} writerClass - writer class
   * @param {string} handlerName - registered handler name
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   */
  static registerWriter(writerClass, handlerName, handlerMask='*'){
    assert(TypeCheck.isSubClassOf(writerClass, Writer), 'Invalid writer type');

    this._register(this._registeredWriters, writerClass, handlerName, handlerMask);
  }

  /**
   * Returns the handler type based on the registration name
   *
   * @param {string} handlerName - name of the registered handler type
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler
   * @return {Handler|null}
   */
  static registeredHandler(handlerName, handlerMask='*'){
    return this._registered(this._registeredHandlers, handlerName, handlerMask);
  }

  /**
   * Returns the reader factory function based on the registration name
   *
   * @param {string} handlerName - name of the registered handler type
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler
   * @return {function|null}
   */
  static registeredReader(handlerName, handlerMask='*'){
    return this._registered(this._registeredReaders, handlerName, handlerMask);
  }

  /**
   * Returns the writer factory function based on the registration name
   *
   * @param {string} handlerName - name of the registered handler type
   * @param {string} [handlerMask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler
   * @return {function|null}
   */
  static registeredWriter(handlerName, handlerMask='*'){
    return this._registered(this._registeredWriters, handlerName, handlerMask);
  }

  /**
   * Returns a list containing the names of the registered handler types
   *
   * @return {Array<string>}
   */
  static registeredHandlerNames(){
    const result = new Set();

    for (const [registeredHandleName] of this._registeredHandlers.keys()){
      result.add(registeredHandleName);
    }

    return [...result];
  }

  /**
   * Returns a list of registered handler makers for the input handler name
   *
   * @param {string} handlerName - registered handler name
   * @return {Array<string>}
   */
  static registeredHandlerMasks(handlerName){
    const result = [];

    const normalizedName = handlerName.toLowerCase();

    for (const [registeredHandleName, registeredMask] of this._registeredHandlers.keys()){
      if (registeredHandleName === normalizedName){
        result.push(registeredMask);
      }
    }

    return result;
  }

  /**
   * Adds a listener to an exception raised during the {@link Handler.output} process.
   * It can happen either during the serialization process ({@link Writer.serialize})
   * or during the finalization of the session ({@link Session.finalize}).
   * This event passes as argument: error, handlerName and handlerMask.
   *
   * Currently this event is static to make easy for developers to hook it when
   * it occurs, if none listener is registered to it then the error is thrown,
   * a stack trace is printed, and the Node.js process exits.
   *
   * ```
   * // registering a listener for the error
   * Mebo.Handler.onErrorDuringOutput((err, handlerName, handlerMask => {
   *    console.error(err.stack);
   * }));
   * ```
   *
   * @param {function} listener - listener function
   */
  static onErrorDuringOutput(listener){
    this._output.on('error', listener);
  }

  /**
   * Creates an instance of a reader for the current handler
   *
   * @param {Action} action - action instance used by the reader to parse the values
   * @param {Object} options - plain object containing the options passed to the reader
   * @return {Reader}
   * @protected
   */
  _createReader(action, options){
    const ReaderClass = Handler.registeredReader(
      this.metadata('handler.name'),
      this.metadata('handler.mask'),
    );

    assert(ReaderClass, 'Invalid registered reader!');
    const reader = new ReaderClass(action);

    // passing options to the reader
    for (const option in options){
      reader.setOption(option, options[option]);
    }

    return reader;
  }

  /**
   * Creates an instance of a writer for the current handler
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} options - plain object containing the options passed to the writer
   * @return {Writer}
   * @protected
   */
  _createWriter(value, options){
    const WriterClass = Handler.registeredWriter(
      this.metadata('handler.name'),
      this.metadata('handler.mask'),
    );

    assert(WriterClass, 'Invalid registered writer!');
    const writer = new WriterClass(value);

    // passing options to the writer
    for (const option in options){
      writer.setOption(option, options[option]);
    }

    return writer;
  }

  /**
   * Loads the {@link Reader} information to the {@link Action} and {@link Session}. This
   * process is called during the execution ({@link Handler.execute}).
   *
   * Changes done by this method to the action:
   * - Assigns the {@link Handler.session} to the action ({@link Action.session})
   * - Modifies the action input values based on the information collected by the reader
   *
   * Changes done by this method to the session:
   * - Modifies the {@link Session.autofill} based on the information collected by the reader
   * ({@link Reader.autofillValues})
   *
   * @param {Action} action - action that should be used
   * @param {Object} options - options passed to the reader
   * @private
   */
  async _load(action, options){

    assert(action instanceof Action, 'Invalid action');

    const readOptions = Util.deepMerge(this.metadata('readOptions', {}), options);
    const reader = this._createReader(action, readOptions);

    // collecting the reader values
    const inputValues = await reader.inputValues();
    const autofillValues = await reader.autofillValues();

    // setting inputs
    for (const inputName in inputValues){
      action.input(inputName).setValue(inputValues[inputName]);
    }

    // setting autofill
    const session = action.session();
    for (const autofillName in autofillValues){
      session.setAutofill(autofillName, autofillValues[autofillName]);
    }
  }

  /**
   * Auxiliary method used to get the registration of writers, readers and handlers.
   *
   * @param {Map} where - map used to find the registration
   * @param {string} handlerName - name of the registered handler type
   * @param {string} handlerMask - mask that supports a glob syntax used
   * to match a custom registered handler
   * @return {Handler|function}
   *
   * @private
   */
  static _registered(where, handlerName, handlerMask){
    assert(TypeCheck.isString(handlerName), 'handlerName needs to be defined as string');
    assert(TypeCheck.isString(handlerMask), 'mask needs to be defined as string');

    let result = null;
    const normalizedHandlerName = handlerName.toLowerCase();
    const normalizedHandlerMask = handlerMask.toLowerCase();

    for (const key of where.keys()){
      if (key[0] === normalizedHandlerName && (key[1] === '*' || minimatch(normalizedHandlerMask, key[1]))){
        result = where.get(key);
        break;
      }
    }

    return result;
  }

  /**
  * Auxiliary method that returns the handler name defined as metadata inside
  * of the action
  *
  * @param {Action} action - action that should be used
  * @return {string|null}
  * @private
  */
  _actionHandlerName(action){
    let result = null;

    const registeredHandlerName = this.metadata('handler.name');
    for (const handlerName in action.metadata('handler', {})){

      // the searching for the handler name (case insensitive)
      if (handlerName.toLowerCase() === registeredHandlerName){
        result = handlerName;
        break;
      }
    }

    return result;
  }

  /**
   * Auxiliary method used for the registration of writers, readers and handlers
   *
   * @param {Map} where - map used to store the registration
   * @param {Handler|function} what - data that should be stored
   * @param {string} handlerName - name of the registered handler type
   * @param {string} handlerMask - mask that supports a glob syntax used
   * to match a custom registered handler
   *
   * @private
   */
  static _register(where, what, handlerName, handlerMask){
    assert(TypeCheck.isString(handlerName), 'Invalid handler registration name!');
    assert(TypeCheck.isString(handlerMask), 'handlerMask needs to be defined as string');
    assert(handlerName.length, 'handlerName cannot be empty');
    assert(handlerMask.length, 'handlerMask cannot be empty');

    const normalilzeHandlerName = handlerName.toLowerCase();
    const normalizedHandlerMask = handlerMask.toLowerCase();

    // validating handler name
    assert(normalilzeHandlerName.length, 'handler name cannot be empty');
    assert((/^([\w_\.\-])+$/gi).test(normalilzeHandlerName), `Invalid handler name: ${normalilzeHandlerName}`); // eslint-disable-line no-useless-escape

    // since when querying registrations the new ones precede to the old ones,
    // therefore the new ones are stored on the top of the pile, for this reason creating
    // a temporary reversed map that will be used to include the new one
    const currentData = new Map();
    for (const key of Array.from(where.keys()).reverse()){

      // if there is already an existing registration for it, skipping it
      if (key[0] === normalilzeHandlerName && key[1] === normalizedHandlerMask){
        continue;
      }

      currentData.set(key, where.get(key));
    }

    // including the new registration
    currentData.set([normalilzeHandlerName, normalizedHandlerMask], what);

    // reversing back the final order
    where.clear();
    for (const key of Array.from(currentData.keys()).reverse()){
      where.set(key, currentData.get(key));
    }
  }

  /**
   * Emits the output error signal, it passes as argument: error, handler name
   * and handler mask.
   *
   * @param {Error} err - exception used as critical error
   */
  _emitOutputError(err){
    process.nextTick(() => {
      this.constructor._output.emit(
        'error',
        err,
        this.metadata('handler.name'),
        this.metadata('handler.mask'),
      );
    });
  }

  static _output = new EventEmitter();
  static _registeredHandlers = new Map();
  static _registeredWriters = new Map();
  static _registeredReaders = new Map();
}

module.exports = Handler;
