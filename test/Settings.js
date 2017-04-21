const assert = require('assert');
const Mebo = require('../src');

const Settings = Mebo.Settings;

describe('Settings:', () => {

  it('Should test setting a new config', () => {
    Settings.set('config', 10);
    Settings.set('valueB', 20);

    assert.equal(Settings.get('config'), 10);
    assert.equal(Settings.get('valueB'), 20);
  });

  it('Should test getting a non existing config by returning a default value when the key is not found', () => {
    assert.equal(Settings.get('invalidConfig', 10), 10);
    assert.equal(Settings.get('invalidConfig'), undefined);
  });

  it('Should test if a key exists under the config', () => {
    assert(!Settings.has('a'));

    Settings.set('a', 20);
    assert(Settings.has('a'));
  });

  it('Should return the keys that are defined under the arbitrary data', () => {
    const currentLength = Settings.keys().length;

    Settings.set('e', 10);
    Settings.set('f', 20);
    assert.equal(Settings.keys().length, currentLength + 2);
    assert(Settings.keys().includes('e'));
    assert(Settings.keys().includes('f'));
  });
});
