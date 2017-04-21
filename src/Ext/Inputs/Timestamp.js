const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


/**
 * Timestamp input.
 *
 * ```javascript
 * const input = Input.create('myInput: timestamp');
 * input.setValue(new Date());
 * ```
 *
 * *This input can also be created using the alias:* `date`
 *
 * <h2>Property Summary</h2>
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Timestamp extends Input{

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
      if (!(value instanceof Date && TypeCheck.isNumber(value.getTime()))){
        throw new ValidationFail('Value needs to be a valid Date', Timestamp.errorCodes[0]);
      }

      return value;
    });
  }

  /**
   * Decodes the value by casting it to the type that is compatible with the input
   *
   * @param {string} value - string containing the encoded value
   * @return {Date}
   * @protected
   */
  static _decode(value){
    return new Date(value);
  }

  static errorCodes = [
    '93b2fcf4-7fc6-4a3d-bfff-4504b37b9801',
  ];
}

// registering the input
Input.registerInput(Timestamp);

// also, registering as 'date' for convenience
Input.registerInput(Timestamp, 'date');

module.exports = Timestamp;
