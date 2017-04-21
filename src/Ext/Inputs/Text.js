const util = require('util');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Text input.
 *
 * ```javascript
 * const input = Input.create('myInput: text');
 * input.setValue('Some text');
 * ```
 *
 * ```javascript
 * // vector
 * const input = Input.create('myInput: text[]');
 * input.setValue(['A', 'B', 'C']);
 * ```
 *
 * *This input can also be created using the alias:* `string`
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * min | minimum number of characters | ::off:: | ::none::
 * max | maximum number of characters | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Text extends BaseText{

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

      // min property
      if (this.hasProperty('min') && value.length < this.property('min')){
        throw new ValidationFail(util.format('Value is too short, it needs to have at least %d characters', this.property('min')), Text.errorCodes[0]);
      }
      // max property
      else if (this.hasProperty('max') && value.length > this.property('max')){
        throw new ValidationFail(util.format('Value is too long, maximum is %d characters', this.property('max')), Text.errorCodes[1]);
      }

      return value;
    });
  }

  static errorCodes = [
    '64358b78-ec83-4494-b734-0b1bdac43720',
    'c7ff4423-2c27-4538-acd7-923dada7f4d3',
  ];
}

// registering the input
Input.registerInput(Text);

// also, registering as 'string' for convenience
Input.registerInput(Text, 'string');

// registering properties
Input.registerProperty(Text, 'min');
Input.registerProperty(Text, 'max');

module.exports = Text;
