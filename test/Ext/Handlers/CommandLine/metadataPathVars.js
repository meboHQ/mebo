const assert = require('assert');
const Mebo = require('../../../../src');

const Metadata = Mebo.Metadata;


describe('CommandLine metadata path vars:', () => {

  it('Should test $commandLine var', () => {
    assert.equal(
      Metadata.pathVar('$commandLine'),
      'handler.commandLine',
    );
  });

  it('Should test $commandLineDescription var', () => {
    assert.equal(
      Metadata.pathVar('$commandLineDescription'),
      'handler.commandLine.readOptions.description',
    );
  });

  it('Should test $commandLineResult var', () => {
    assert.equal(
      Metadata.pathVar('$commandLineResult'),
      'handler.commandLine.writeOptions.result',
    );
  });
});
