const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Email address input.
 *
 * ```javascript
 * const input = Input.create('myInput: email');
 * input.setValue('test@domain.com');
 * ```
 *
 * <h2>Property Summary</h2>
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Email extends BaseText{

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

      // format checking
      if (!Email._emailFormatRegEx.test(value)){
        throw new ValidationFail('Invalid email format', Email.errorCodes[0]);
      }

      return value;
    });
  }

  static errorCodes = [
    '93d6f463-6650-46c8-bb9f-e5c3bc00d78e',
  ];
}

Email._emailFormatRegEx = /^[a-zA-Z0-9.+/=?^_-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// registering the input
Input.registerInput(Email);

module.exports = Email;
