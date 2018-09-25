const assert = require('assert');
const debug = require('debug')('Mebo');
const TypeCheck = require('js-typecheck');
const path = require('path');
const fs = require('fs');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _data = Symbol('data');

/**
 * Provides access to the general configuration used across Mebo.
 *
 * ```javascript
 * const Mebo = require('mebo');
 *
 * // listing the available settings
 * console.log(Mebo.Settings.keys());
 * ```
 */
class Settings{
  /**
   * Sets a value based on key & value under the settings
   *
   * @param {string} key - name of the key
   * @param {*} value - value for the key
   */
  static set(key, value){
    assert(TypeCheck.isString(key), 'key needs to be defined as string');

    this[_data][key] = value;
  }

  /**
   * Returns the value assigned for the key
   *
   * @param {string} key - name of the key
   * @param {*} [defaultValue] - optional value returned when the key is not assigned
   * @return {*}
   */
  static get(key, defaultValue=undefined){
    if (key in this[_data]){
      return this[_data][key];
    }

    return defaultValue;
  }

  /**
   * Returns a boolean telling if the input key is under the arbitrary data
   *
   * @param {string} key - key name
   * @return {boolean}
   */
  static has(key){
    return (key in this[_data]);
  }

  /**
   * Returns the keys included under the settings
   *
   * @return {Array<string>}
   */
  static keys(){
    return Object.keys(this[_data]).sort();
  }
}

Settings[_data] = Object.create(null);

// default settings:
// apiVersion
// Sets the api version about the application that is using this library, this information
// is used as part of the request response (default: version found inside of `CWD/package.json`)
// @see http://semver.org
const _packageFilePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(_packageFilePath)){
  // todo: we are reading package.json file using 'fs' instead of 'require' to avoid
  // a bug related with dynamic importing in madge (used to check for circular references):
  // https://github.com/pahen/madge/issues/157
  Settings.set('apiVersion', JSON.parse(fs.readFileSync(_packageFilePath)).version); // eslint-disable-line
}
else{
  debug('Unable to find package.json under the CWD');
  Settings.set('apiVersion', '');
}

// exporting the module
module.exports = Settings;
