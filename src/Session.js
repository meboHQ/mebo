const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Tasks = require('./Tasks');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _arbitraryData = Symbol('arbitraryData');
const _autofill = Symbol('autofill');
const _wrapup = Symbol('wrapup');
const _terminated = Symbol('terminated');


/**
 * A session is used to store the data shared between actions.
 *
 * This object is created automatically by {@link Handler.create} and
 * {@link Action.create}.
 */
class Session{

  /**
   * Creates a session
   *
   * @param {Tasks} [wrapup] - task object used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session
   */
  constructor(wrapup=null){

    assert(wrapup === null || wrapup instanceof Tasks, 'wrapup needs to defined with a Tasks object or null');

    this[_wrapup] = wrapup || new Tasks();
    this[_terminated] = false;

    // container used to store autofill values inside of the session
    this[_autofill] = {};

    // generic container used to store arbitrary inside of the session
    this[_arbitraryData] = {};
  }

  /**
   * Returns the tasks object used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session. Wrapup actions can be used to avoid
   * the execution of an action that may be triggered multiple times across
   * nested actions where ideally it should be executed only once in the end,
   * after all nested actions are done.
   *
   * @return {Tasks}
   */
  wrapup(){
    return this[_wrapup];
  }

  /**
   * Returns a value under the autofill data.
   *
   * This feature is used to set the initial input value for inputs that contain the `autofill`
   * property. It works by looking if the value of the autofill input's property is under the
   * {@link Session.autofill} then if found it sets the input value with the value of the
   * {@link Session.autofill}. This process occurs when a session is assigned to the action
   * ({@link Action.setSession}).
   *
   * When inputs that contain the property `autofill` are initialized through the
   * {@link Handler} they will try to find their values under the autofill,
   * however if a value is not defined for them they will assign their input value
   * to the autofill data automatically.
   *
   * @param {string} key - key name used to query the autofill value
   * @param {*} [defaultValue] - optional default value returned in case
   * the key does not exist
   * @return {*}
   */
  autofill(key, defaultValue=undefined){
    assert(TypeCheck.isString(key), 'key needs to defined as string');

    if (key in this[_autofill]){
      return this[_autofill][key];
    }

    return defaultValue;
  }

  /**
   * Returns a boolean telling if the key exists under the autofill data.
   *
   * @param {string} key - key name
   * @return {boolean}
   */
  hasAutofill(key){
    return (key in this[_autofill]);
  }

  /**
   * Sets a key & value under the autofill data
   *
   * @param {string} key - key name
   * @param {*} value - value associated with the key
   *
   * @see {@link Session.autofill}
   */
  setAutofill(key, value){
    assert(TypeCheck.isString(key), 'key needs to defined as string');

    this[_autofill][key] = value;
  }

  /**
   * Returns the keys included in the autofill data
   *
   * @return {Array<string>}
   */
  autofillKeys(){
    return Object.keys(this[_autofill]);
  }

  /**
   * Sets a key & value under the arbitrary data. This is used to store data
   * that may be only available in specific handlers, for instance the
   * request object created by express is assigned to the session through this
   * method by the web handler.
   *
   * @param {string} key - name of the key
   * @param {*} value - value for the key
   */
  set(key, value){
    assert(TypeCheck.isString(key), 'key needs to defined as string');

    this[_arbitraryData][key] = value;
  }

  /**
   * Returns an value assigned for the key inside of the arbitrary data
   *
   * @param {string} key - name of the key
   * @param {*} [defaultValue] - optional value returned when the key is not assigned
   * @return {*}
   */
  get(key, defaultValue=undefined){
    if (key in this[_arbitraryData]){
      return this[_arbitraryData][key];
    }

    return defaultValue;
  }

  /**
   * Returns a boolean telling if the input key is under the arbitrary data
   *
   * @param {string} key - key name
   * @return {boolean}
   */
  has(key){
    return (key in this[_arbitraryData]);
  }

  /**
   * Returns the keys included in the arbitrary data
   *
   * @return {Array<string>}
   */
  keys(){
    return Object.keys(this[_arbitraryData]);
  }

  /**
   * Terminates the session by executing the {@link wrapup}
   * tasks.
   *
   * This is called by the {@link Handler} during the execution of
   * {@link Handler.output}.
   *
   * @return {Promise}
   */
  async finalize(){

    const wrapup = this.wrapup();
    if (!wrapup.isEmpty()){

      await wrapup.run();
      wrapup.clear();
    }

    return true;
  }

  /**
   * Returns a cloned version of the current session where all autofill
   * and arbitrary data are transferred to the cloned version.
   *
   * This feature is used by the actions during the session assignment
   * ({@link Action.setSession}) to prevent that modifications done in the session
   * of nested actions reflect back in the session used by the parent actions.
   * Therefore, acting as scope for changes in the autofill & arbitrary data.
   *
   * The current wrapup is also assigned to the cloned version.
   *
   * @return {Session}
   */
  clone(){
    const result = new Session(this.wrapup());

    // transferring autofill data
    for (const autofillKey in this[_autofill]){
      result.setAutofill(autofillKey, this[_autofill][autofillKey]);
    }

    // transferring arbitrary data
    for (const arbitraryKey in this[_arbitraryData]){
      result.set(arbitraryKey, this[_arbitraryData][arbitraryKey]);
    }

    return result;
  }
}

module.exports = Session;
