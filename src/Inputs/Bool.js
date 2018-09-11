const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../Errors/ValidationFail');
const Input = require('../Input');


/**
 * Boolean input.
 *
 * ```javascript
 * const input = Input.create('myInput: bool');
 * input.setValue(false);
 * ```
 *
 * ```javascript
 * // vector version
 * const input = Input.create('myInput: bool[]');
 * input.setValue([false, true, false]);
 * ```
 *
 * *This input can also be created using the alias:* `boolean`
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * primitive | ensures the value is a primitive | ::on:: | ::true::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Bool extends Input{

  /**
   * Implements input's validations
   *
   * @param {null|number} at - index used when input has been created as a vector that
   * tells which value should be used
   * @return {Promise<*>} value held by the input based on the current context (at)
   * @protected
   */
  _validation(at){

    // calling super class validations
    return super._validation(at).then((value) => {

      // type checking
      if (!(TypeCheck.isBool(value) || value instanceof Boolean)){
        throw new ValidationFail(
          'Value needs to be a boolean',
          '4304c51a-a48f-41d2-a2b8-9ba43c6617f3',
        );
      }
      // primitive property
      else if (this.property('primitive') && value instanceof Boolean){
        throw new ValidationFail(
          'Value needs to be a primitive',
          '5decf593-f5a2-4368-a675-9b47256c395a',
        );
      }

      return value;
    });
  }

  /**
   * Decodes the input value from the string representation ({@link _encodeScalar}) to the
   * data type of the input. This method is called internally during {@link parseValue}
   *
   * @param {string} value - string containing the encoded value
   * @return {bool}
   * @protected
   */
  static _decodeScalar(value){
    return this._isTrue(value);
  }

  /**
   * Encodes the input value to a string representation that can be later decoded
   * through {@link _decodeScalar}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {*} value - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encodeScalar(value){
    return (value) ? '1' : '0';
  }

  /**
   * Decodes a vector value from the string representation ({@link Input._encodeVector}) to the
   * data type of the input. This method is called internally during {@link Input.parseValue}
   *
   * @param {string} value - encoded value
   * @return {*}
   * @protected
   */
  static _decodeVector(value){
    assert(TypeCheck.isString(value), 'value needs to be defined as string');

    const parsedValue = JSON.parse(value);
    assert(TypeCheck.isList(parsedValue), 'Could not parse, unexpected data type');

    return parsedValue.map(this._isTrue);
  }

  /**
   * Encodes a vector value to a string representation that can be later decoded
   * through {@link Input._decodeVector}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {Array<string>} values - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encodeVector(values){
    assert(TypeCheck.isList(values), 'values needs to be defined as array');

    return JSON.stringify(values.map(Number));
  }

  /**
   * Returns if the input value is true
   *
   * @param {string|boolean} value - value to be tested
   * @return {boolean}
   * @private
   */
  static _isTrue(value){
    return ['true', '1'].includes(String(value));
  }
}

// registering the input
Input.register(Bool);

// also, registering as 'boolean' for convenience
Input.register(Bool, 'boolean');

// registering properties
Input.registerProperty(Bool, 'primitive', true);

module.exports = Bool;
