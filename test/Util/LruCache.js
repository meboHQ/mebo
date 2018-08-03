const assert = require('assert');
const Mebo = require('../../src');

const LruCache = Mebo.Utils.LruCache;


describe('Util LruCache:', () => {

  it('Should create a cache', () => {
    const cache = new LruCache(1024, 1000);
    assert.equal(cache.size, 1024);
    assert.equal(cache.lifespan, 1000);
  });

  it('Should add a value to the cache', () => {
    const cache = new LruCache(1024, 1000);
    cache.set('test', 10);

    assert.equal(cache.length, 1);
    assert.equal(cache.get('test'), 10);
  });

  it('Should flush the cache', () => {
    const cache = new LruCache(1024, 1000);
    cache.flush();

    cache.set('test', 10);
    cache.set('test2', 10);
    cache.flush();

    assert.equal(cache.length, 0);
  });

  it('Should remove an item from the cache', () => {
    const cache = new LruCache(1024, 1000);
    cache.set('test', 10);
    cache.set('test2', 10);

    cache.flush('test2');

    assert.equal(cache.length, 1);
  });

  it('Should tell if the cache contains the key', () => {
    const cache = new LruCache(1024, 1000);
    cache.set('test', 10);

    assert(!cache.has('test2'));
    assert(cache.has('test'));
  });

  it('if a key does not exist it should return the defaultValue', () => {
    const cache = new LruCache(1024, 1000);
    assert.equal(cache.get('test', 12), 12);
  });

  it('Should test the lifespan', (done) => {
    const cache = new LruCache(8, 50);
    cache.set('test', 10);
    assert.equal(cache.get('test'), 10);

    setTimeout(() => {
      done((cache.has('test')) ? new Error('Not Expected') : null);
    }, 60);
  });

  it('Should return the keys that are part of the cache', () => {
    const cache = new LruCache(1024, 1000);

    assert.equal(cache.keys().length, 0);

    cache.set('test', 10);
    cache.set('test2', 10);

    let test = false;
    let test2 = false;
    for (const key of cache.keys()){
      if (key === 'test'){
        test = true;
      }
      else if (key === 'test2'){
        test2 = true;
      }
    }

    assert(test);
    assert(test2);
  });
});
