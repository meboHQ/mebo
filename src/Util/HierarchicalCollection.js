const assert = require('assert');
const TypeCheck = require('js-typecheck');
const deepMerge = require('./deepMerge');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _collection = Symbol('collection');


/**
 * Provides an interface to deal with data in a multi dimension plain object.
 *
 * It automatically creates the intermediate levels when assigning a value under
 * nested levels to the collection. Also, if the value already exists
 * under the collection then it allows the value to be merged with the
 * existing values.
 * @private
 */
class HierarchicalCollection{

  /**
   * Creates a new instance
   */
  constructor(){
    this[_collection] = {};
  }

  /**
   * Inserts a new value to the collection
   *
   * @param {string} path - path about where the value should be stored (the levels
   * must be separated by '.').
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  insert(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');
    assert(path.length, 'path cannot be empty');
    assert((/^([\w_\.\-])+$/gi).test(path), `Illegal path name: ${path}`); // eslint-disable-line no-useless-escape

    let currentLevel = this[_collection];
    let finalLevel = path;

    // building the intermediate levels if necessary
    if (path.indexOf('.') !== -1){
      const levels = path.split('.');
      for (const level of levels.slice(0, -1)){
        if (!(level in currentLevel)){
          currentLevel[level] = {};
        }

        currentLevel = currentLevel[level];
      }
      finalLevel = levels.slice(-1)[0];
    }

    // assigning value
    if (merge && TypeCheck.isPlainObject(value) && finalLevel in currentLevel){
      const merged = deepMerge(currentLevel[finalLevel], value);
      Object.assign(currentLevel[finalLevel], merged);
    }
    else{
      currentLevel[finalLevel] = value;
    }
  }

  /**
   * Returns a value under the collection
   *
   * @param {string} path - path about where the value is localized (the levels
   * must be separated by '.'). In case of empty string the entire collection
   * is returned.
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  query(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    let currentLevel = this[_collection];

    // returning the entire collection
    if (!path.length){
      return currentLevel;
    }

    // no intermediate levels
    if (path.indexOf('.') === -1){
      if (!(path in currentLevel)){
        return defaultValue;
      }
      return currentLevel[path];
    }

    // otherwise find the value going through the intermediate levels
    const levels = path.split('.');
    for (const level of levels){
      if (!(level in currentLevel)){
        return defaultValue;
      }

      currentLevel = currentLevel[level];
    }

    return currentLevel;
  }

  /**
   * Returns a list of the root levels
   *
   * @return {Array<string>}
   */
  root(){
    return Object.keys(this[_collection]);
  }
}

module.exports = HierarchicalCollection;
