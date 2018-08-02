const debug = require('debug')('Mebo');
const assert = require('assert');
const crypto = require('crypto');

// optional dependency (requires node-gyp)
let xxhash = null;
try{
  xxhash = require('xxhash'); // eslint-disable-line
}
catch(err){
  /* istanbul ignore next */
  debug('xxHash not available');
}


/**
 * Returns a non-cryptographic hash for the buffer. By default it tries to
 * use xxHash, however if it's not available (node-gyp) then it uses SHA256
 * as fallback.
 *
 * @param {Buffer} value - buffer value that should be used to generate the hash
 * @param {Object} options - custom options
 * @param {boolean} [options.forceFallback=false] - when enabled forces to use the
 * fallback hash
 * @param {number} [options.seed=0xA] - seed used by the xxHash
 * @return {string}
 * @private
 */
function hash(value, {forceFallback=false, seed=0xA}={}){
  assert(value instanceof Buffer, 'Invalid buffer instance');

  let result;

  // whenever possible lets use xxHash
  if (!forceFallback && xxhash){
    result = xxhash.XXHash64.hash(value, seed).toString('hex');
  }
  // otherwise fallback to sha256
  else{
    result = crypto.createHash('sha256').update(value).digest('hex');
  }

  return result;
}

module.exports = hash;
