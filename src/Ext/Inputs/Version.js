const util = require('util');
const compareVersions = require('compare-versions');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Version input.
 *
 * This input follows the semver convention.
 *
 * ```javascript
 * const input = Input.create('myInput: version');
 * input.setValue('2.2.1');
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * minimumRequired | minimum version required | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 *
 * @see http://semver.org
 */
class Version extends BaseText{

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

      // minimumVersionRequired
      if (this.property('minimumRequired') && compareVersions(value, this.property('minimumRequired')) === -1){
        throw new ValidationFail(util.format('Version is not compatible, minimum Version required: %s, current version %s', this.property('minimumRequired'), value), Version.errorCodes[0]);
      }

      return value;
    });
  }

  static errorCodes = [
    '524f9ed1-44e8-43d8-83b1-72dc8d33788b',
  ];
}

// registering the input
Input.registerInput(Version);

// registering properties
Input.registerProperty(Version, 'minimumRequired');

module.exports = Version;
