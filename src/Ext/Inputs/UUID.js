const uuid = require('uuid');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * UUID input.
 *
 * ```javascript
 * const input = Input.create('myInput: uuid');
 * input.setValue('075054e0-810a-11e6-8c1d-e5fb28c699ca');
 * ```
 *
 * <h2>Property Summary</h2>
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 *
 * @see https://en.wikipedia.org/wiki/Universally_unique_identifier
 */
class UUID extends BaseText{

  /**
   * Generates a new time based id (uuid v1) and assigns it to the value
   * of the input. This method is not supported by vector inputs.
   *
   */
  setTimeBasedRandom(){
    if (this.isVector()){
      throw new Error('Not supported, input is a vector!');
    }

    this.setValue(uuid.v1());
  }

  /**
   * Generates a new random id (uuid v4) and assigns it to the value
   * of the input. This method is not supported by vector inputs.
   */
  setRandom(){
    if (this.isVector()){
      throw new Error('Not supported, input is a vector!');
    }

    this.setValue(uuid.v4());
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

      // format checking
      if (!UUID._uuidFormatRegEx.test(value)){
        throw new ValidationFail('Invalid UUID format', UUID.errorCodes[0]);
      }

      return value;
    });
  }

  static errorCodes = [
    '66b476c7-d1d3-4241-91a3-d71154807840',
  ];
}

UUID._uuidFormatRegEx = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;

// registering the input
Input.registerInput(UUID);

module.exports = UUID;
