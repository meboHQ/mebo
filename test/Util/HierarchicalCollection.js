const assert = require('assert');
const Mebo = require('../../src');

const HierarchicalCollection = Mebo.Utils.HierarchicalCollection;


describe('Util HierarchicalCollection:', () => {

  it('Should insert a value to the collection', () => {

    const collection = new HierarchicalCollection();
    const value = 10;

    collection.insert('myKey', value);
    assert.equal(collection.query('myKey'), value);
  });

  it('Should insert a multi level value to the collection', () => {

    const collection = new HierarchicalCollection();
    const value = 10;

    collection.insert('a.b.c.d.myKey', value);
    assert.equal(collection.query('a.b.c.d.myKey'), value);
  });

  it('Should return the root levels', () => {

    const collection = new HierarchicalCollection();

    collection.insert('a', 10);
    collection.insert('b.c', 12);

    const result = collection.root();

    assert.equal(result.length, 2);
    assert.equal(result[0], 'a');
    assert.equal(result[1], 'b');
  });

  it('Should return the default value when value does not exist in collection', () => {

    const collection = new HierarchicalCollection();
    assert.equal(collection.query('does.not.exist', 20), 20);
  });

  it('Should merge value with existing (default option)', () => {

    const collection = new HierarchicalCollection();

    collection.insert('test.level', {
      a: 1,
    });
    collection.insert('test.level', {
      b: 2,
    });

    assert.equal(collection.query('test.level.a'), 1);
    assert.equal(collection.query('test.level.b'), 2);
  });

  it('Should not merge value with existing', () => {

    const collection = new HierarchicalCollection();

    collection.insert(
      'test.level',
      {
        a: 1,
      },
    );

    collection.insert(
      'test.level',
      {
        b: 2,
      },
      false,
    );

    assert.equal(collection.query('test.level.a'), undefined);
    assert.equal(collection.query('test.level.b'), 2);
  });

  it('Passing an empty string should return the entire collection', () => {
    const collection = new HierarchicalCollection();

    collection.insert('a', 10);
    collection.insert('b', 12);

    const result = collection.query('');

    assert.equal(result.a, 10);
    assert.equal(result.b, 12);
  });
});
