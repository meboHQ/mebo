const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../Errors/ValidationFail');
const Input = require('../Input');
const BaseText = require('./BaseText');


/**
 * Hexadecimal input.
 *
 * ```javascript
 * const input = Input.create('myInput: hex');
 * input.setValue('ffff00');
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * size | optional maximum bit size of the value | ::none:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Hex extends BaseText{

  /**
   * Returns the current value in decimal
   *
   * @return {number}
   */
  decimalValue(){
    const currentValue = this.value();
    assert(Hex._isHexValue(currentValue), 'Current value is not hexadecimal');

    return parseInt(currentValue, 16);
  }

  /**
   * Sets the current value from a decimal number
   *
   * @param {number} value - decimal value
   */
  setValueFromDecimal(value){
    assert(TypeCheck.isNumber(value), 'Value needs to be a number');

    this.setValue(value.toString(16));
  }

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

      // hex value checking
      if (!Hex._isHexValue(value)){
        throw new ValidationFail(
          'Invalid hex value',
          '1747c406-2a14-4d0f-8a1d-1c554763e8a3',
        );
      }
      // value size checking
      else if (this.property('size') && (value.length / 2) * 8 > this.property('size')){
        throw new ValidationFail(
          'Value exceeds the maximum bit size',
          '0f8d2885-a4ac-4b7f-bb5b-32466c85363a',
        );
      }

      return value;
    });
  }

  /**
   * Auxiliary method that returns a boolean telling if the value is a valid
   * Hexadecimal value.
   *
   * @param {string} value - string containing the hex value
   * @return {boolean}
   * @private
   */
  static _isHexValue(value){
    return (TypeCheck.isString(value) && this._uuidFormatRegEx.test(value));
  }

  static _uuidFormatRegEx = /^[0-9a-fA-F]+$/;
}

// registering the input
Input.register(Hex);

// registering properties
Input.registerProperty(Hex, 'size');

module.exports = Hex;
