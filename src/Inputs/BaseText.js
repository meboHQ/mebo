const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../MeboErrors/ValidationFail');
const Input = require('../Input');


/**
 * Base text input class derived by all text input implementations.
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * primitive | ensures the value is a primitive | ::on:: | ::true::
 * regex | custom regular expression to test the value | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class BaseText extends Input{

  /**
   * Returns if the input is empty
   * @return {boolean}
   */
  isEmpty(){
    return (super.isEmpty() || this.value().length === 0);
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

      // type checking
      if (!TypeCheck.isString(value)){
        throw new ValidationFail(
          'Value needs to be a string',
          '71b205ae-95ed-42a2-b5e9-ccf8e42ba454',
        );
      }
      // primitive property
      else if (this.property('primitive') && value instanceof String){
        throw new ValidationFail(
          'Value needs to be a primitive',
          '81b44982-3c7b-4a25-952b-70ec640c58d4',
        );
      }
      // regex property
      else if (this.property('regex') && (!(new RegExp(this.property('regex'))).test(value))){
        throw new ValidationFail(
          'Value does not meet the requirements',
          'c902610c-ef17-4a10-bc75-887d1550793a',
        );
      }

      return value;
    });
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

    return parsedValue;
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

// registering properties
Input.registerProperty(BaseText, 'primitive', true);
Input.registerProperty(BaseText, 'regex');

module.exports = BaseText;
