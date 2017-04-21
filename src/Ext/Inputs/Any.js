const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


/**
 * Any value input.
 *
 * This input type holds any kind of object, however it's not exposed for
 * handlers ({@link Handler}). It's intended to be used only internally.
 *
 * ```javascript
 * const input = Input.create('myInput: any');
 * input.setValue({a: 1});
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * hidden | boolean telling if the input is hidden from the {@link Reader}, \
 * therefore it should only be used internally | ::on:: | ::true::
 * allowedInstance | Specific object type that should be allowed by the input \
 * | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Any extends Input{

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
      if (!TypeCheck.isObject(value)){
        throw new ValidationFail('Value needs to be an object!', Any.errorCodes[0]);
      }
      // allowed instance checking
      else if (this.property('allowedInstance') && !(value instanceof this.property('allowedInstance'))){
        throw new ValidationFail(`Invalid object type: ${value.constructor.name}, expecting ${this.property('allowedInstance').name}`, Any.errorCodes[1]);
      }

      return value;
    });
  }

  /**
   * Serialization is not supported
   *
   * @return {boolean}
   */
  isSerializable(){
    return false;
  }

  static errorCodes = [
    '25c9158a-30ee-4a9f-8767-bc2c170f77fd',
    'd59814e4-0432-435a-b116-4491819c58d4',
  ];
}

// registering the input
Input.registerInput(Any);

// registering properties
Input.registerProperty(Any, 'hidden', true);
Input.registerProperty(Any, 'allowedInstance');

module.exports = Any;
