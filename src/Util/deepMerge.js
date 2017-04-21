const assert = require('assert');
const TypeCheck = require('js-typecheck');


/**
 * Merges two plain objects recursively and returns a new one
 *
 * @param {Object} objectA - plain object a
 * @param {Object} objectB - plain object b
 * @return {Object}
 * @private
 */
function deepMerge(objectA, objectB){

  assert(TypeCheck.isPlainObject(objectA), 'objectA needs to be a plain object');
  assert(TypeCheck.isPlainObject(objectB), 'objectB needs to be a plain object');

  const result = Object.assign({}, objectA);

  for (const key in objectB){

    // merging objects
    if (TypeCheck.isPlainObject(objectB[key]) && key in objectA){
      result[key] = deepMerge(objectA[key], objectB[key]);
    }
    // overriding / assigning
    else{
      result[key] = objectB[key];
    }
  }

  return result;
}

module.exports = deepMerge;
