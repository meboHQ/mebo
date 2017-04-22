const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Util = require('./Util');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _collection = Symbol('collection');


/**
 * Metadata provides a way for actions ({@link Action}) to control about how a
 * handler should perform the reading ({@link Reader}) and writing
 * ({@link Writer}) operations. Therefore, making possible handlers to perform
 * differently per action basis.
 *
 * This is done by defining {@link Reader} & {@link Writer} options through
 * the metadata. By doing that the options are passed from the action to the
 * handler during the handler's execution ({@link Handler.execute}).
 *
 * You can define options by either using the full option location or using
 * option variables:
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
 *    _perform(data){
 *
 *      // defining a custom header using full option
 *      // location (not recommended, see option variable)
 *      this.setMetadata('handler.web.writeOptions.headers', {
 *        someOption: 'foo',
 *      });
 *
 *      // ...
 *    }
 * }
 * ```
 *
 * **Option variable (recommended):**
 * Eliminates the need of using convoluted long names to define the options by
 * simply using a variable that represents a full option location:
 *
 * ```
 * class MyAction extends Mebo.Action{
 *    _perform(data){
 *
 *      // defining a custom header by using the `$webHeaders` variable, rather
 *      // than the full option location (`handler.web.writeOptions.headers`)
 *      this.setMetadata('$webHeaders', {
 *        someOption: 'foo',
 *      });
 *
 *      // ...
 *    }
 * }
 * ```
 *
 * The complete list of the available variables can be found bellow, it's
 * separated by handler type. Also, new variables can be assigned through
 * {@link Metadata.registerPathVar}.
 *
 * <h2>Web Variables</h2>
 *
 * Variable name | Value | Value used by
 * --- | --- | ---
 * $web | `handler.web` |
 * $webUploadDirectory | `$web.readOptions.uploadDirectory` | {@link WebRequest}
 * $webUploadPreserveName | `$web.readOptions.uploadPreserveName` | {@link WebRequest}
 * $webUploadMaxFileSize | `$web.readOptions.uploadMaxFileSize` | {@link WebRequest}
 * $webMaxFields | `$web.readOptions.maxFields` | {@link WebRequest}
 * $webMaxFieldsSize | `$web.readOptions.maxFieldsSize` | {@link WebRequest}
 * $webHeaders | `$web.writeOptions.headers` | {@link WebResponse}
 * $webHeadersOnly | `$web.writeOptions.headersOnly`| {@link WebResponse}
 * $webResult | `$web.writeOptions.result`| {@link WebResponse}
 * $webRoot | `$web.writeOptions.root`| {@link WebResponse}
 * $webSuccessStatus | `$web.writeOptions.successStatus`| {@link WebResponse}
 * $webResultLabel | `$web.writeOptions.resultLabel`| {@link WebResponse}
 *
 * <h2>Command line Variables</h2>
 *
 * Variable name | Value | Value used by
 * --- | --- | ---
 * $commandLine` | `handler.commandLine` |
 * $commandLineDescription` | `$commandLine.readOptions.description` | {@link CommandLineArgs}
 * $commandLineResult` | `$commandLine.writeOptions.result` | {@link CommandLineOutput}
 */
class Metadata{

  /**
   * Creates a metadata
   */
  constructor(){
    this[_collection] = new Util.HierarchicalCollection();
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
   * register a path variable to under metadata
   *
   * The value of the variable can contain other pre-defined path variables,
   * for instance:
   * ```
   * Mebo.Metadata.registerPathVar('$myVar', '$otherVar.data')
   * ```
   *
   * @param {string} name - name of the variable
   * @param {string} value - value for the variable
   */
  static registerPathVar(name, value){
    assert(TypeCheck.isString(name), 'name needs to be defined as string');
    assert(TypeCheck.isString(value), 'value needs to be defined as string');
    assert((/^([\w_\$\.\-])+$/gi).test(value), `Illegal characters found variable (${name}) value: ${value}`); // eslint-disable-line no-useless-escape

    this._validatePathVarName(name);

    // flushing cache
    this._cachedPathVariables = {};

    // assigning variable
    this._pathVariables[name] = value;
  }

  /**
   * Returns the value for a path variable
   *
   * for instance:
   * ```
   * const myVariableValue = Mebo.Metadata.pathVar('$myVariable');
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
  static pathVar(name, processValue=true){

    this._validatePathVarName(name);
    if (!(name in this._pathVariables)){
      throw new Error(`Path variable ${name} is undefined`);
    }

    if (processValue){
      return this._resolvePathVar(name);
    }

    return this._pathVariables[name];
  }

  /**
   * Returns a boolean telling if the variable name is defined
   *
   * @param {string} name - variable name
   * @return {boolean}
   */
  static hasPathVar(name){
    this._validatePathVarName(name);

    return (name in this._pathVariables);
  }

  /**
   * Returns a list of the registered variable names under the metadata
   *
   * @return {Array<string>}
   */
  static registeredPathVars(){
    return Object.keys(this._pathVariables);
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
          processedPath.push(Metadata.pathVar(part));
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
  static _resolvePathVar(name, rootName, depth=0){

    // detecting circular references
    if (depth >= this._maxDepth){
      const error = new Error(`Circular reference detected while processing the value for $${rootName}`);

      // processing the stack of the error to get rid of the duplicated entries
      // caused by the recursion (we don't need to show 1000+ lines of the same
      // thing, the error explanation should be good enough)
      const stackContents = error.stack.split('\n');
      error.stack = stackContents.slice(0, 2).concat(stackContents.slice(this._maxDepth + 1)).join('\n');
      throw error;
    }

    // processing value
    const rawValue = this._pathVariables[name];

    // in case the value is not under the cache, lets process it
    if (!(name in this._cachedPathVariables)){

      // checking if the value contains any variable
      let processedValue = rawValue;
      if (rawValue.indexOf('$') !== -1){

        // splitting the levels of the value that are separated by '.'
        const processedValueParts = [];
        for (const part of rawValue.split('.')){
          let processedPartValue;

          // in case of a variable
          if (part.startsWith('$')){

            this._validatePathVarName(part);
            // processing variable value
            processedPartValue = this._resolvePathVar(part, rootName || name, depth + 1);
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
      this._cachedPathVariables[name] = processedValue;
    }

    // returning value from cache
    return this._cachedPathVariables[name];
  }

  /**
   * Check if the variable is defined using the proper syntax, otherwise in case
   * of any issues an exception is raised
   *
   * @param {string} name - variable name
   * @private
   */
  static _validatePathVarName(name){
    assert(TypeCheck.isString(name), 'name needs to be a string');

    // check if variable name starts with $
    if (!name.startsWith('$')){
      throw new Error(`Path variable (${name}) needs to start with: $`);
    }

    // checking if variable is empty
    const cleanVarName = name.slice(1);
    if (!cleanVarName.length){
      throw new Error('Path variable cannot be empty');
    }

    // checking for invalid syntax
    else if (!(/^([\w_])+$/gi).test(cleanVarName)){
      throw new Error(`Path variable (${name}) contains invalid characters`);
    }
  }

  static _pathVariables = {};
  static _cachedPathVariables = {};
  static _maxDepth = 1000;
}

module.exports = Metadata;
