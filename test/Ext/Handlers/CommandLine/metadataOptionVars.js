const assert = require('assert');
const Mebo = require('../../../../src');

const Metadata = Mebo.Metadata;


describe('CommandLine metadata option vars:', () => {

  it('Should test $commandLine var', () => {
    assert.equal(
      Metadata.optionVar('$commandLine'),
      'handler.commandLine',
    );
  });

  it('Should test $commandLineDescription var', () => {
    assert.equal(
      Metadata.optionVar('$commandLineDescription'),
      'handler.commandLine.readOptions.description',
    );
  });

  it('Should test $commandLineResult var', () => {
    assert.equal(
      Metadata.optionVar('$commandLineResult'),
      'handler.commandLine.writeOptions.result',
    );
  });
});
