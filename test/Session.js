const assert = require('assert');
const Mebo = require('../src');

const Session = Mebo.Session;
const Tasks = Mebo.Tasks;
const LruCache = Mebo.Util.LruCache;


describe('Session:', () => {

  it('Should create a session with default options', () => {
    const session = new Session();

    assert(session.wrapup() instanceof Tasks);
    assert(session.resultCache() instanceof LruCache);

    // autofill data should start empty
    assert.equal(session.autofillKeys().length, 0);

    // arbitrary data should start empty
    assert.equal(session.keys().length, 0);
  });

  it('Should create a session with customized options', () => {
    const wrapup = new Mebo.Tasks();
    wrapup.addWrappedPromise(() => {
      Promise.resolve(true);
    });

    const resultCache = new Mebo.Util.LruCache(10 * 1024 * 1024, 60 * 1000);
    resultCache.set('test', 10);
    const session = new Session(wrapup, resultCache);

    assert(!session.wrapup().isEmpty());
    assert.equal(session.resultCache().keys()[0], 'test');
  });

  it('Should test setting the arbitrary data', () => {
    const session = new Session();
    session.set('value', 10);
    session.set('valueB', 20);

    assert.equal(session.get('value'), 10);
    assert.equal(session.get('valueB'), 20);
  });

  it('Should test the arbitrary data by returning a default value when the key is not found', () => {
    const session = new Session();
    assert.equal(session.get('doesNotExist', 10), 10);
    assert.equal(session.get('doesNotExist'), undefined);
  });

  it('Should test if a key exists under the arbitrary data', () => {
    const session = new Session();
    assert(!session.has('a'));

    session.set('a', 20);
    assert(session.has('a'));
  });

  it('Should return the keys that are defined under the arbitrary data', () => {
    const session = new Session();

    session.set('a', 10);
    session.set('b', 20);
    assert.equal(session.keys().length, 2);
    assert(session.keys().includes('a'));
    assert(session.keys().includes('b'));
  });

  it('Should return if a value exists under the autofill', () => {
    const session = new Session();

    session.setAutofill('a', 10);
    session.setAutofill('b', 20);
    assert(session.hasAutofill('a'));
    assert(session.hasAutofill('b'));
  });

  it('Should return the keys that are defined under the autofill data', () => {
    const session = new Session();

    session.setAutofill('a', 10);
    session.setAutofill('b', 20);
    assert.equal(session.autofillKeys().length, 2);
    assert(session.autofillKeys().includes('a'));
    assert(session.autofillKeys().includes('b'));
  });

  it('Should clone the current session', () => {
    const session = new Session();
    session.setAutofill('a', 10);
    session.set('b', 20);

    const clonedSession = session.clone();

    assert.notEqual(session, clonedSession);

    // autofill
    assert.equal(session.autofillKeys().length, 1);
    assert.equal(clonedSession.autofillKeys().length, 1);
    assert.equal(session.autofill('a'), clonedSession.autofill('a'));

    // arbitrary data
    assert.equal(session.keys().length, 1);
    assert.equal(clonedSession.keys().length, 1);
    assert.equal(session.get('a'), clonedSession.get('a'));

    // wrapup
    assert.equal(session.wrapup(), clonedSession.wrapup());

    // result cache
    assert.equal(session.resultCache(), clonedSession.resultCache());
  });

  it('Cloned session should have a different autofill', () => {
    const session = new Session();
    session.setAutofill('a', 10);

    const clonedSession = session.clone();
    clonedSession.setAutofill('b', 20);

    assert.notEqual(session, clonedSession);

    // autofill
    assert.equal(session.autofillKeys().length, 1);
    assert.equal(clonedSession.autofillKeys().length, 2);
    assert.equal(session.autofill('a'), clonedSession.autofill('a'));
    assert.equal(clonedSession.autofill('b'), 20);
  });

  it('Cloned session should have a different arbitrary data', () => {
    const session = new Session();
    session.set('a', 10);

    const clonedSession = session.clone();
    clonedSession.set('b', 20);

    assert.notEqual(session, clonedSession);

    // autofill
    assert.equal(session.keys().length, 1);
    assert.equal(clonedSession.keys().length, 2);
    assert.equal(session.get('a'), clonedSession.get('a'));
    assert.equal(clonedSession.get('b'), 20);
  });
});
