const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


/**
 * Buffer input.
 *
 * ```javascript
 * const input = Input.create('myInput: buffer');
 * input.setValue(Buffer.from('test', 'ascii');
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * hidden | boolean telling if the input is hidden from the {@link Reader}, \
 * therefore it should only be used internally | ::on:: | ::true::
 * maxLength | maximum size of the buffer in bytes | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Buf extends Input{

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

      const maxLength = this.property('maxLength');

      // type checking
      if (!(value instanceof Buffer)){
        throw new ValidationFail('Value needs to be a Buffer!', Buf.errorCodes[0]);
      }

      // specific type check
      else if (maxLength !== null && value.length > maxLength){
        throw new ValidationFail('Value exceeds the maximum length', Buf.errorCodes[1]);
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
    return Buffer.from(value, 'base64');
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
    return value.toString('base64');
  }

  static errorCodes = [
    '4c5c74ab-21f1-4df2-8985-8b4c030df3ed',
    '4387c432-ffd6-48d6-a144-91566d262fa0',
  ];
}

// registering the input
Input.registerInput(Buf);

// also, registering as 'string' for convenience
Input.registerInput(Buf, 'buffer');

// registering properties
Input.registerProperty(Buf, 'hidden', true);
Input.registerProperty(Buf, 'maxLength');

module.exports = Buf;
