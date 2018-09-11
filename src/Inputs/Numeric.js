const assert = require('assert');
const util = require('util');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../Errors/ValidationFail');
const Input = require('../Input');


/**
 * Numeric input.
 *
 * ```javascript
 * const input = Input.create('myInput: numeric');
 * input.setValue(5);
 * ```
 *
 * *This input can also be created using the alias:* `number`
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * primitive | ensures the value is a primitive | ::on:: | ::true::
 * min | minimum allowed value | ::off:: | ::none::
 * max | maximum allowed value | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Numeric extends Input{

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
      if (!(TypeCheck.isNumber(value) || value instanceof Number)){
        throw new ValidationFail(
          'Value needs to be a number',
          'b9f7f1bf-18a3-45f8-83d0-aa8f34f819f6',
        );
      }
      // primitive property
      else if (this.property('primitive') && value instanceof Number){
        throw new ValidationFail(
          'Value needs to be a primitive',
          '2e2e4535-f346-4829-9cd1-ced2b8969c9e',
        );
      }
      // min property
      else if (this.hasProperty('min') && value < this.property('min')){
        throw new ValidationFail(
          util.format('Value needs to be greater or equal to the minimum: %d', this.property('min')),
          '12e85420-04ae-4ef0-b64c-400b68bced3c',
        );
      }
      // max property
      else if (this.hasProperty('max') && value > this.property('max')){
        throw new ValidationFail(
          util.format('Value needs to be less or equal to the maximum: %d', this.property('max')),
          'd1d3ffc2-67e9-4404-873c-199603ca7632',
        );
      }

      return value;
    });
  }

  /**
   * Decodes the value by casting it to the type that is compatible with the input
   *
   * @param {string} value - string containing the encoded value
   * @return {number}
   * @protected
   */
  static _decodeScalar(value){
    return Number(value);
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

    return parsedValue.map(Number);
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

    return JSON.stringify(values);
  }
}

// registering the input
Input.register(Numeric);

// also, registering as 'number' for convenience
Input.register(Numeric, 'number');

// registering properties
Input.registerProperty(Numeric, 'primitive', true);
Input.registerProperty(Numeric, 'min');
Input.registerProperty(Numeric, 'max');

module.exports = Numeric;
