const crypto = require('crypto');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const Hex = require('./Hex');


/**
 * Hash input.
 *
 * ```javascript
 * const input = Input.create('myInput: hash', {size: 64});
 * input.setValue('b542f74248124c32');
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * size | size of the hash in bits. This property needs to be defined at constructor \
 *  time | ::true:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Hash extends Hex{

  constructor(...args){
    super(...args);

    // making sure 'size' property has been defined
    if (TypeCheck.isNone(this.property('size'))){
      throw new Error(`Can't create a hash input (${this.name()}) without the 'size' property!`);
    }

    // locking the 'size' property
    this.lockProperty('size');
  }

  /**
   * Generates a new random hash and assigns it to the value of the input. This method
   * is not supported by vector inputs.
   */
  setRandom(){
    if (this.isVector()){
      throw new Error('Not supported, input is a vector!');
    }

    const size = this.property('size', 0) / 8;
    this.setValue(crypto.randomBytes(size).toString('hex'));
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

      // size checking
      if (this.property('size') !== (value.length / 2) * 8){
        throw new ValidationFail('Invalid hash value size', Hash.errorCodes[0]);
      }

      return value;
    });
  }

  static errorCodes = [
    'c83d98b0-8409-47c3-89c9-f81452c910c0',
  ];
}

// registering the input
Input.registerInput(Hash);

module.exports = Hash;
