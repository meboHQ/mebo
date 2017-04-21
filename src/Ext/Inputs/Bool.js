const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


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
        throw new ValidationFail('Value needs to be a boolean', Bool.errorCodes[0]);
      }
      // primitive property
      else if (this.property('primitive') && value instanceof Boolean){
        throw new ValidationFail('Value needs to be a primitive', Bool.errorCodes[1]);
      }

      return value;
    });
  }

  /**
   * Decodes the input value from the string representation ({@link _encode}) to the
   * data type of the input. This method is called internally during {@link parseValue}
   *
   * @param {string} value - string containing the encoded value
   * @return {bool}
   * @protected
   */
  static _decode(value){
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Encodes the input value to a string representation that can be later decoded
   * through {@link _decode}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {*} value - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encode(value){
    return (value) ? '1' : '0';
  }

  static errorCodes = [
    '4304c51a-a48f-41d2-a2b8-9ba43c6617f3',
    '5decf593-f5a2-4368-a675-9b47256c395a',
  ];
}

// registering the input
Input.registerInput(Bool);

// also, registering as 'boolean' for convenience
Input.registerInput(Bool, 'boolean');

// registering properties
Input.registerProperty(Bool, 'primitive', true);

module.exports = Bool;
