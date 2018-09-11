const assert = require('assert');
const Mebo = require('../../../src');

const Metadata = Mebo.Metadata;


describe('Cli metadata option vars:', () => {

  it('Should test $cli var', () => {
    assert.equal(
      Metadata.optionVar('$cli'),
      'handler.cli',
    );
  });

  it('Should test $cliResult var', () => {
    assert.equal(
      Metadata.optionVar('$cliResult'),
      'handler.cli.writeOptions.result',
    );
  });
});
