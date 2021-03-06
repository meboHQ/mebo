const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Utils = require('./Utils');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _collection = Symbol('collection');
const _optionVariables = Symbol('optionVariables');
const _cachedOptionVariables = Symbol('cachedOptionVariables');
const _maxDepth = Symbol('maxDepth');

/**
 * Metadata provides a way for actions ({@link Action}) to control about how a
 * handler should perform the reading ({@link Reader}) and writing
 * ({@link Writer}) operations. Therefore, making possible handlers to perform
 * differently per action basis.
 *
 * This is done by defining {@link Reader} & {@link Writer} options through
 * the metadata. By doing that the options are passed from the action to the
 * handler during the handler's execution ({@link Handler.runAction}).
 *
 * You can define options by either using option variables or the full option location:
 *
 * **Option var (recommended):**
 * Eliminates the need of using convoluted long names to define the options by
 * simply using a variable that represents a full option location:
 *
 * Example:
 * ```
 * class MyAction extends Mebo.Action{
 *
 *    constructor(){
 *      super();
 *      // defining a custom uploadDirectory by using the `$webUploadDirectory` variable,
 *      // rather than the full option location (`handler.web.readOptions.uploadDirectory`)
 *      this.setMeta('$webUploadDirectory', '/tmp/customUploadDir');
 *    }
 *
 *    async _perform(data){
 *      // ...
 *    }
 *
 *    async _after(err, value){
 *      // defining a custom header that only affects the web handler
 *      // this call could be done inside of the _perform method. However, we
 *      // are defining it inside of the _after to keep _perform as
 *      // abstract as possible. Since, _after is always called (even during
 *      // an error) after the execution of the action, it provides a way to
 *      // hook and define custom metadata related with the result.
 *      if (!err){
 *        // defining a custom header by using the `$webHeaders` variable, rather
 *        // than the full option location (`handler.web.writeOptions.headers`)
 *        this.setMeta('$webHeaders', {
 *          someOption: 'foo',
 *        });
 *      }
 *    }
 * }
 * ```
 *
 * **Full option location:**
 * Uses a convention interpreted by the {@link Handler.metadata} to describe
 * where the option is localized:
 * ```
 * handler.<HANDLER_NAME>.<OPERATION>Options.<OPTION_NAME>
 * ```
 *
 * Example:
 * ```
 * class MyAction extends Mebo.Action{
 *    constructor(){
 *      super();
 *      this.setMeta('handler.web.readOptions.uploadDirectory', '/tmp/customUploadDir');
 *    }
 *
 *    async _perform(data){
 *      // ...
 *    }
 *
 *    async _after(err, value){
 *
 *      if (!err){
 *        // location (not recommended, see option var)
 *        this.setMeta('handler.web.writeOptions.headers', {
 *          someOption: 'foo',
 *        });
 *      }
 *    }
 * }
 * ```
 *
 * The complete list of the available option variables can be found bellow, it's
 * separated by handler type. Also, new variables can be assigned through
 * {@link Metadata.registerOptionVar}.
 *
 * <h2>Web Variables</h2>
 *
 * Variable name | Value | Value used by
 * --- | --- | ---
 * $web | `handler.web` |
 * $webUploadDirectory | `$web.readOptions.uploadDirectory` | {@link WebRequest}
 * $webUploadPreserveName | `$web.readOptions.uploadPreserveName` | {@link WebRequest}
 * $webDefaultUploadMaxFileSize | `$web.readOptions.uploadDefaultMaxFileSize` | {@link WebRequest}
 * $webMaxFields | `$web.readOptions.maxFields` | {@link WebRequest}
 * $webMaxFieldsSize | `$web.readOptions.maxFieldsSize` | {@link WebRequest}
 * $webHeaders | `$web.writeOptions.headers` | {@link WebResponse}
 * $webHeadersOnly | `$web.writeOptions.headersOnly`| {@link WebResponse}
 * $webResult | `$web.writeOptions.result`| {@link WebResponse}
 * $webRoot | `$web.writeOptions.root`| {@link WebResponse}
 * $webStatus | `$web.writeOptions.status`| {@link WebResponse}
 * $webResultLabel | `$web.writeOptions.resultLabel`| {@link WebResponse}
 *
 * <h2>Cli Variables</h2>
 *
 * Variable name | Value | Value used by
 * --- | --- | ---
 * $cli | `handler.cli` |
 * $cliResult | `$cli.writeOptions.result` | {@link CliOutput}
 */
class Metadata{

  /**
   * Creates a metadata
   */
  constructor(){
    this[_collection] = new Utils.HierarchicalCollection();
  }

  /**
   * Returns a value under the metadata.
   *
   * @param {string} path - path about where the value is localized (the levels
   * must be separated by '.'). In case of empty string the entire metadata
   * is returned.
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  value(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    return this[_collection].query(Metadata._resolvePath(path), defaultValue);
  }

  /**
   * Sets a value to the metadata.
   *
   * @param {string} path - path about where the value should be stored under the metadata
   * (the levels must be separated by '.')
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  setValue(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    this[_collection].insert(Metadata._resolvePath(path), value, merge);
  }

  /**
   * Returns a list of the root levels under the metadata
   *
   * @return {Array<string>}
   */
  root(){
    return this[_collection].root();
  }

  /**
   * register an option variable under metadata
   *
   * The value of the variable can contain other pre-defined option variables,
   * for instance:
   * ```
   * Mebo.Metadata.registerOptionVar('$myVar', '$otherVar.data')
   * ```
   *
   * @param {string} name - name of the variable
   * @param {string} value - value for the variable
   */
  static registerOptionVar(name, value){
    assert(TypeCheck.isString(name), 'name needs to be defined as string');
    assert(TypeCheck.isString(value), 'value needs to be defined as string');
    assert((/^([\w_\$\.\-])+$/gi).test(value), `Illegal characters found variable (${name}) value: ${value}`); // eslint-disable-line no-useless-escape

    this._validateOptionVarName(name);

    // flushing cache
    this[_cachedOptionVariables] = {};

    // assigning variable
    this[_optionVariables][name] = value;
  }

  /**
   * Returns the value for an option variable
   *
   * for instance:
   * ```
   * const myVariableValue = Mebo.Metadata.optionVar('$myVariable');
   * console.log(myVariableValue)
   * ```
   *
   * @param {string} name - name of the variable
   * @param {boolean} [processValue=true] - process any variables that may be
   * defined as part of the value
   * @return {string}
   *
   * @throws {Error} throws an error if the var name is undefined
   * under the metadata.
   */
  static optionVar(name, processValue=true){

    this._validateOptionVarName(name);
    if (!(name in this[_optionVariables])){
      throw new Error(`Option variable ${name} is undefined`);
    }

    if (processValue){
      return this._resolveOptionVar(name);
    }

    return this[_optionVariables][name];
  }

  /**
   * Returns a boolean telling if the variable name is defined
   *
   * @param {string} name - variable name
   * @return {boolean}
   */
  static hasOptionVar(name){
    this._validateOptionVarName(name);

    return (name in this[_optionVariables]);
  }

  /**
   * Returns a list of the registered variable names under the metadata
   *
   * @return {Array<string>}
   */
  static registeredOptionVars(){
    return Object.keys(this[_optionVariables]);
  }

  /**
   * Returns the path resolved by processing any variables that may
   * be defined as part of the path
   *
   * @param {string} path - path to be resolved
   * @return {string}
   */
  static _resolvePath(path){

    // if the path contains variables lets process it
    if (path.indexOf('$') !== -1){
      const processedPath = [];
      for (const part of path.split('.')){
        if (part.startsWith('$')){
          processedPath.push(Metadata.optionVar(part));
        }
        else{
          processedPath.push(part);
        }
      }

      // processed path
      return processedPath.join('.');
    }

    return path;
  }

  /**
   * Returns the value of the variable by processing any variables
   * that may be defined as part of the value
   *
   * @param {string} name - variable name
   * @param {string} [rootName] - root variable name used to report the origin
   * of the circular reference error
   * @param {number} [depth=0] - deep used to identify max recursion caused
   * by circular references
   * @return {string}
   * @private
   */
  static _resolveOptionVar(name, rootName, depth=0){

    // detecting circular references
    if (depth >= this[_maxDepth]){
      const error = new Error(`Circular reference detected while processing the value for $${rootName}`);

      // processing the stack of the error to get rid of the duplicated entries
      // caused by the recursion (we don't need to show 1000+ lines of the same
      // thing, the error explanation should be good enough)
      const stackContents = error.stack.split('\n');
      error.stack = stackContents.slice(0, 2).concat(stackContents.slice(this[_maxDepth] + 1)).join('\n');
      throw error;
    }

    // processing value
    const rawValue = this[_optionVariables][name];

    // in case the value is not under the cache, lets process it
    if (!(name in this[_cachedOptionVariables])){

      // checking if the value contains any variable
      let processedValue = rawValue;
      if (rawValue.indexOf('$') !== -1){

        // splitting the levels of the value that are separated by '.'
        const processedValueParts = [];
        for (const part of rawValue.split('.')){
          let processedPartValue;

          // in case of a variable
          if (part.startsWith('$')){

            this._validateOptionVarName(part);
            // processing variable value
            processedPartValue = this._resolveOptionVar(part, rootName || name, depth + 1);
          }
          // otherwise just use the part without any processing
          else{
            processedPartValue = part;
          }
          processedValueParts.push(processedPartValue);
        }

        // building back the structure of the value
        processedValue = processedValueParts.join('.');
      }

      // adding processed value to the cache
      this[_cachedOptionVariables][name] = processedValue;
    }

    // returning value from cache
    return this[_cachedOptionVariables][name];
  }

  /**
   * Check if the variable is defined using the proper syntax, otherwise in case
   * of any issues an exception is raised
   *
   * @param {string} name - variable name
   * @private
   */
  static _validateOptionVarName(name){
    assert(TypeCheck.isString(name), 'name needs to be a string');

    // check if variable name starts with $
    if (!name.startsWith('$')){
      throw new Error(`Option variable (${name}) needs to start with: $`);
    }

    // checking if variable is empty
    const cleanVarName = name.slice(1);
    if (!cleanVarName.length){
      throw new Error('Option variable cannot be empty');
    }

    // checking for invalid syntax
    else if (!(/^([\w_])+$/gi).test(cleanVarName)){
      throw new Error(`Option variable (${name}) contains invalid characters`);
    }
  }
}

Metadata[_optionVariables] = {};
Metadata[_cachedOptionVariables] = {};
Metadata[_maxDepth] = 1000;

module.exports = Metadata;
