const assert = require('assert');
const Mebo = require('../../src');

const hash = Mebo.Utils.hash;

// optional dependency (requires node-gyp)
let xxhash = null;
try{
  xxhash = require('xxhash'); // eslint-disable-line
}
catch(err){
  // ...
}

describe('Util hash:', () => {
  it('Should return a hash using the fallback algorithm (used when xxHash is not available)', () => {
    const value = Buffer.from('my value');

    // the fallback uses sha256
    assert.equal(hash(value, {forceFallback: true}), 'db90a6356b637ea6f90bbba59eca8ced9953d7f6d194628824fc38c9cedb0a56');
  });

  // the following tests are only performed when xxHash is available
  if (xxhash){
    it('Should return a hash using xxHash', () => {
      const value = Buffer.from('my value');

      assert.equal(hash(value), 'b542f74248124c32');
    });

    it('Should return a hash using xxHash with a different seed', () => {
      const value = Buffer.from('my value');

      assert.equal(hash(value, {seed: 0xFF}), 'AA68285E48BB1A4F'.toLowerCase() /* to ignore spell-check lint */);
    });
  }
});
