const TypeCheck = require('js-typecheck');


/**
 * Map implementation designed to hold immutable data.
 *
 * This object makes sure that values held by the map cannot have their data
 * modified.
 */
class ImmutableMap extends Map{

  /**
   * Sets a key and value to the map
   *
   * @param {*} key - key associated with the value
   * @param {*} value - value that will be stored immutable
   */
  set(key, value){
    super.set(key, this._deepFreeze(value));
  }

  /**
   * Auxiliary method that recursively makes the input object immutable
   *
   * @param {object} value - object that should become immutable
   * @return {object}
   * @private
   */
  _deepFreeze(value){

    if (TypeCheck.isNone(value) || value instanceof Buffer){
      return value;
    }

    // freezing all property
    for (const propertyName of Object.getOwnPropertyNames(value)){
      const property = value[propertyName];

      // freeze prop if it is an object
      if (TypeCheck.isObject(property)){
        this._deepFreeze(property);
      }
    }

    // freeze self (no-op if already frozen)
    return Object.freeze(value);
  }
}

module.exports = ImmutableMap;
