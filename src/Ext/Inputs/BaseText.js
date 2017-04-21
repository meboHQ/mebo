const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


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
        throw new ValidationFail('Value needs to be a string', BaseText.errorCodes[0]);
      }
      // primitive property
      else if (this.property('primitive') && value instanceof String){
        throw new ValidationFail('Value needs to be a primitive', BaseText.errorCodes[2]);
      }
      // regex property
      else if (this.property('regex') && (!(new RegExp(this.property('regex'))).test(value))){
        throw new ValidationFail('Value does not meet the requirements', BaseText.errorCodes[1]);
      }

      return value;
    });
  }

  static errorCodes = [
    '71b205ae-95ed-42a2-b5e9-ccf8e42ba454',
    'c902610c-ef17-4a10-bc75-887d1550793a',
    '81b44982-3c7b-4a25-952b-70ec640c58d4',
  ];
}

// registering properties
Input.registerProperty(BaseText, 'primitive', true);
Input.registerProperty(BaseText, 'regex');

module.exports = BaseText;
