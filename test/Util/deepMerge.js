const assert = require('assert');
const Mebo = require('../../src');


describe('Util deepMerge:', () => {
  it('Should merge two plain objects', () => {

    const objectA = {a: 1};
    const objectB = {b: 10};
    const result = Mebo.Util.deepMerge(objectA, objectB);

    assert.equal(objectA.a, result.a);
    assert.equal(objectB.b, result.b);
  });

  it('Should merge two plain objects recursively', () => {

    const objectA = {deep: {levelA: 1}};
    const objectB = {deep: {levelB: 10}};
    const result = Mebo.Util.deepMerge(objectA, objectB);

    assert.equal(objectA.deep.levelA, result.deep.levelA);
    assert.equal(objectB.deep.levelB, result.deep.levelB);
  });

  it('Should merge two plain objects recursively where objectB overrides some of objectA', () => {

    const objectA = {deep: {levelA: 1, otherLevel: 20}};
    const objectB = {deep: {levelA: 10}};
    const result = Mebo.Util.deepMerge(objectA, objectB);
    assert.equal(objectA.deep.levelA.otherLevel, result.deep.levelA.otherLevel);
    assert.equal(objectB.deep.levelB, result.deep.levelB);
  });
});
