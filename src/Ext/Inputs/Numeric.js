const util = require('util');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


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
        throw new ValidationFail('Value needs to be a number', Numeric.errorCodes[0]);
      }
      // primitive property
      else if (this.property('primitive') && value instanceof Number){
        throw new ValidationFail('Value needs to be a primitive', Numeric.errorCodes[3]);
      }
      // min property
      else if (this.hasProperty('min') && value < this.property('min')){
        throw new ValidationFail(util.format('Value needs to be greater or equal to the minimum: %d', this.property('min')), Numeric.errorCodes[1]);
      }
      // max property
      else if (this.hasProperty('max') && value > this.property('max')){
        throw new ValidationFail(util.format('Value needs to be less or equal to the maximum: %d', this.property('max')), Numeric.errorCodes[2]);
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
  static _decode(value){
    return Number(value);
  }

  static errorCodes = [
    'b9f7f1bf-18a3-45f8-83d0-aa8f34f819f6',
    '12e85420-04ae-4ef0-b64c-400b68bced3c',
    'd1d3ffc2-67e9-4404-873c-199603ca7632',
    '2e2e4535-f346-4829-9cd1-ced2b8969c9e',
  ];
}

// registering the input
Input.registerInput(Numeric);

// also, registering as 'number' for convenience
Input.registerInput(Numeric, 'number');

// registering properties
Input.registerProperty(Numeric, 'primitive', true);
Input.registerProperty(Numeric, 'min');
Input.registerProperty(Numeric, 'max');

module.exports = Numeric;
