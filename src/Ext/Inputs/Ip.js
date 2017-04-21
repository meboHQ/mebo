const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const BaseText = require('./BaseText');
const nodeIp = require('ip');


/**
 * Ip address input.
 *
 * ```javascript
 * // ipv4
 * const input = Input.create('myInput: ip');
 * input.setValue('192.168.0.1');
 * ```
 *
 * ```javascript
 * // ipv6
 * const input = Input.create('myInput: ip');
 * input.setValue('::ffff:127.0.0.1');
 * ```
 *
 * ```javascript
 * // initializes the value of the input with 'remoteAddress'
 * // which is defined by the web handler
 * const input = Input.create('myInput: ip', {autofill: 'remoteAddress'});
 * console.log(input.value());
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * allowV6 | boolean telling if the input allows ipv6 | ::on:: | ::true::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Ip extends BaseText{

  /**
   * Returns a boolean telling if the value is ipv4
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {boolean}
   */
  isV4(at=null){

    const value = this.valueAt(at);
    return nodeIp.isV4Format(value);
  }

  /**
   * Returns a boolean telling if the value is ipv6
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {boolean}
   */
  isV6(at=null){

    const value = this.valueAt(at);
    return nodeIp.isV6Format(value);
  }

  /**
   * Returns a boolean telling if the value is a private ip address
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {boolean}
   */
  isPrivate(at=null){

    const value = this.valueAt(at);
    return nodeIp.isPrivate(value);
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

      // checking ip version
      if (!(this.isV4(at) || (this.property('allowV6') && this.isV6(at)))){
        throw new ValidationFail('Invalid ip!', Ip.errorCodes[0]);
      }

      return value;
    });
  }

  static errorCodes = [
    '54cb9e90-468e-49ea-8f34-512a7b729d28',
  ];
}

// registering the input
Input.registerInput(Ip);

// registering properties
Input.registerProperty(Ip, 'allowV6', true);

module.exports = Ip;
