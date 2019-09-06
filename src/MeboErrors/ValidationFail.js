const assert = require('assert');
const TypeCheck = require('js-typecheck');
const MeboError = require('../MeboError');
const Settings = require('../Settings');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _inputName = Symbol('inputName');
const _code = Symbol('code');
const _message = Symbol('message');


/**
 * Exception raised by {@link Input} validations.
 *
 * It carries additional information about the context of the error that can be used when
 * reporting/handling it. For this reason when this exception handled by a {@link Handler}
 * it gets encoded into json {@link ValidationFail.toJSON}.
 *
 * ```javascript
 * throw new ValidationFail('File does not exit!')
 * ```
 * @see {@link Writer._errorOutput}
 */
class ValidationFail extends MeboError{

  /**
   * Initialize the exception
   *
   * @param {string} message - error message
   * @param {string} [code] - unique code based on uuid v4 that can be used to identify the error
   * @param {string} [inputName] - name of the input about where the exception was generated
   * type
   */
  constructor(message, code=null, inputName=null){
    assert(TypeCheck.isString(message) && message.length, 'message needs to defined as valid string (cannot be empty)');

    super(message);

    this.code = code;
    this.inputName = inputName;

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/validationFail/status')`
     * (default: `400`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/validationFail/status');

    /**
     * Boolean telling if this error is not allowed as output ({@link Handler.output})
     * when it has been raised from a nested action (an action created from another
     * action ({@link Action.createAction})). When output is disabled the error
     * will not be handled by the {@link Writer}, therefore the error will be
     * emitted by the signal {@link Handler.onErrorDuringOutput}.
     *
     * Value driven by:
     * `Settings.get('error/validationFail/disableOutputInNested')`
     * (default: `true`)
     *
     * @type {boolean}
     */
    this.disableOutputInNested = Settings.get('error/validationFail/disableOutputInNested');

    // storing the original message
    this[_message] = message;

    this._updateMessage();
  }

  /**
   * Sets the input name related with the validation
   *
   * @param {string} [inputName] - name of the input
   */
  set inputName(inputName){
    assert(inputName === null || (TypeCheck.isString(inputName) && inputName.length), 'inputName needs to defined as valid string');

    this[_inputName] = inputName;

    this._updateMessage();
  }

  /**
   * Returns the input name related with the validation
   *
   * @type {string}
   */
  get inputName(){
    return this[_inputName];
  }

  /**
   * Sets an unique error code specifically related with that has failed validation, this
   * information can be used later to identify the origin of the error, instead of trying
   * to parse the message to figure out that information.
   *
   * @param {string} [errorCode] - unique code based on uuid v4 that can be used to identify the error
   */
  set code(errorCode){
    assert(errorCode === null || /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(errorCode), 'errorCode needs to defined as uuid or null');

    this[_code] = errorCode;
  }

  /**
   * Returns the code related with the validation itself
   *
   * @type {string}
   */
  get code(){
    return this[_code];
  }

  /**
   * Bakes the exception into a json string
   *
   * @return {string} json string containing the serialized version of the exception
   */
  toJSON(){
    return JSON.stringify({
      message: this[_message],
      code: this.code,
      inputName: this.inputName,
    });
  }

  /**
   * Creates a ValidationFail instance based on the input json string
   *
   * @param {string} json - string containing the serialized json version of the exception
   * @return {ValidationFail}
   */
  static fromJSON(json){
    assert(TypeCheck.isString(json) && json.length, 'json needs to be defined as valid string');

    const data = JSON.parse(json);
    return new ValidationFail(data.message, data.code, data.inputName);
  }

  /**
   * Auxiliary method that updates the validation fail message
   * @private
   */
  _updateMessage(){

    if (this.inputName){
      this.message = `${this.inputName}: ${this[_message]}`;
    }
    else{
      this.message = this[_message];
    }
  }
}

// default settings
Settings.set('error/validationFail/status', 400);
Settings.set('error/validationFail/disableOutputInNested', true);

module.exports = ValidationFail;
