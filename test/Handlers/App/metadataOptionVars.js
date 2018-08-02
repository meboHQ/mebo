const assert = require('assert');
const Mebo = require('../../../src');

const Metadata = Mebo.Metadata;


describe('App metadata option vars:', () => {

  it('Should test $app var', () => {
    assert.equal(
      Metadata.optionVar('$app'),
      'handler.app',
    );
  });

  it('Should test $appDescription var', () => {
    assert.equal(
      Metadata.optionVar('$appDescription'),
      'handler.app.readOptions.description',
    );
  });

  it('Should test $appResult var', () => {
    assert.equal(
      Metadata.optionVar('$appResult'),
      'handler.app.writeOptions.result',
    );
  });
});
