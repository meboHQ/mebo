const StreamModule = require('stream');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


/**
 * Stream input.
 *
 * ```javascript
 * const input = Input.create('myInput: stream');
 * //...
 * input.setValue(fs.createReadStream('file.txt'));
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * hidden | boolean telling if the input is hidden from the {@link Reader}, \
 * therefore it should only be used internally | ::on:: | ::true::
 * streamType | specific stream type allowed by the input: `readable`, `writable`, \
 * `duplex` and `transform` | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Stream extends Input{

  /**
   * Implements input's validations
   *
   * @param {null|number} at - index used when input has been created as a vector that
   * tells which value should be used
   * @return {Promise<*>} value held by the input based on the current context (at)
   * @protected
   */
  _validation(at){

    return super._validation(at).then((value) => {

      // type checking
      if (!(value instanceof StreamModule)){
        throw new ValidationFail('Value needs to be an instance of stream!', Stream.errorCodes[0]);
      }

      // specific type check
      else if (this.property('streamType')){

        let success = false;
        const streamType = this.property('streamType');
        if (streamType === 'readable' && value instanceof StreamModule.Readable){
          success = true;
        }
        else if (streamType === 'writable' && value instanceof StreamModule.Writable){
          success = true;
        }
        else if (streamType === 'duplex' && value instanceof StreamModule.Duplex){
          success = true;
        }
        else if (streamType === 'transform' && value instanceof StreamModule.Transform){
          success = true;
        }

        if (!success){
          throw new ValidationFail('Invalid stream type!', Stream.errorCodes[1]);
        }
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
    '0d891ebd-e494-4439-87c6-2a6fa96e7bcc',
    '21e29315-d2d0-412a-a000-dc6e9852b94e',
  ];
}

// registering the input
Input.registerInput(Stream);

// registering properties
Input.registerProperty(Stream, 'hidden', true);
Input.registerProperty(Stream, 'streamType');

module.exports = Stream;
