const assert = require('assert');
const Mebo = require('../../src');

const ImmutableMap = Mebo.Util.ImmutableMap;


describe('Util ImmutableMap:', () => {

  it('Should add a value to the map', () => {
    const map = new ImmutableMap();
    map.set('test', 10);

    assert.equal(map.size, 1);
    assert.equal(map.get('test'), 10);
  });

  it('Should clear the map', () => {
    const map = new ImmutableMap();
    map.set('test', 10);
    map.set('test2', 10);

    map.clear();

    assert.equal(map.size, 0);
  });

  it('Should remove an item from the map', () => {
    const map = new ImmutableMap();
    map.set('test', 10);
    map.set('test2', 10);

    map.delete('test2');

    assert.equal(map.size, 1);
  });

  it('Should tell if the map contains the key', () => {
    const map = new ImmutableMap();
    map.set('test', 10);

    assert(!map.has('test2'));
    assert(map.has('test'));
  });

  it('Should return the keys that are part of the map', () => {
    const map = new ImmutableMap();

    map.set('test', 10);
    map.set('test2', 10);

    let test = false;
    let test2 = false;
    for (const key of map.keys()){
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

  it('Should make sure the value is immutable', () => {
    const map = new ImmutableMap();
    const value = {a: {b: 1, c: 'test', d: null}};
    map.set('test', value);

    for (const key of ['b', 'c', 'd', 'd']){
      try{
        value.a[key] = 'other value';
        throw new Error('unexpected');
      }
      catch(e){
        assert(e instanceof TypeError);
      }
    }
  });
});
