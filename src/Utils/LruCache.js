const assert = require('assert');
const TypeCheck = require('js-typecheck');
const LruCacheBase = require('lru-cache');
const sizeof = require('object-sizeof');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _size = Symbol('size');
const _lifespan = Symbol('lifespan');
const _cache = Symbol('cache');


/**
 * A cache that discards the least recently used items first.
 *
 * This feature is used by the {@link Session} to store the result of
 * cacheable actions ({@link Action.isCacheable}).
 */
class LruCache{

  /**
   * Creates an LruCache
   *
   * @param {number} size - Sets in bytes the maximum size of the cache
   * @param {number} lifespan - Lifespan in milliseconds about amount of time that
   * an item under LRU cache should be kept alive
   */
  constructor(size, lifespan){

    assert(TypeCheck.isNumber(size), 'size requires a number value');
    assert(TypeCheck.isNumber(lifespan), 'lifespan requires a number value');

    this[_size] = size;
    this[_lifespan] = lifespan;

    // lazy creation
    this[_cache] = null;
  }

  /**
   * Returns the size of the cache in bytes
   *
   * @type {number}
   */
  get size(){
    return this[_size];
  }

  /**
   * Returns the lifespan for the values held by the cache in seconds
   *
   * @type {number}
   */
  get lifespan(){
    return this[_lifespan];
  }

  /**
   * Resets the cache by flushing it
   *
   * @param {string} [key] - id associated with the value otherwise flushes the whole
   * cache
   */
  flush(key=null){

    if (this[_cache] === null){
      return;
    }

    if (key){
      this[_cache].del(key);
    }
    else{
      this[_cache].reset();
    }
  }

  /**
   * Returns a list containing the keys of the values held by the cache
   *
   * @return {Array<string>}
   */
  keys(){
    return (this[_cache] === null) ? [] : this[_cache].keys();
  }

  /**
   * Returns the number of items held by the cache
   *
   * @type {number}
   */
  get length(){
    return this.keys().length;
  }

  /**
   * Returns a boolean telling if the input key is under the cache
   *
   * @param {string} key - id associated with the value
   * @return {boolean}
   */
  has(key){
    return (this[_cache] !== null && this[_cache].has(key));
  }

  /**
   * Returns the value from the lru cache based on the input {@link Action.id},
   * otherwise if the id is not found under the cache then returns undefined
   *
   * @param {string} key - id associated with the value
   * @param {*} [defaultValue=undefined] - value returned in case the key does not exist
   * @return {*}
   */
  get(key, defaultValue=undefined){
    assert(TypeCheck.isString(key), 'Invalid action key!');

    return (this.has(key)) ? this[_cache].get(key).data : defaultValue;
  }

  /**
   * Sets a result value to the lru cache, this value is associated with the {@link Action.id}
   *
   * @param {string} key - id associated with the value
   * @param {*} value - value that should be store by the cache
   */
  set(key, value){
    assert(TypeCheck.isString(key), 'Invalid action key!');

    if (this[_cache] === null){
      this[_cache] = new LruCacheBase({
        max: this[_size],
        maxAge: this[_lifespan],
        length: (n, k) => {
          return n.memorySize;
        }});
    }

    const resultHolder = Object.create(null);
    resultHolder.memorySize = sizeof(value);
    resultHolder.data = value;

    this[_cache].set(key, resultHolder);
  }
}

module.exports = LruCache;
