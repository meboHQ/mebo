const assert = require('assert');
const path = require('path');
const stream = require('stream');
const crypto = require('crypto');
const Mebo = require('../../../../src');
const testutils = require('../../../../testutils');


describe('CommandLine Stream:', () => {

  class WriteStream extends stream.Writable{
    constructor(){
      super();
      this.data = [];
    }

    _write(chunk, enc, next){
      this.data.push(chunk);
      next();
    }
  }

  const testDataImagePath = path.join(__dirname, '../../../../testutils/data/image.png');

  before(() => {
    Mebo.registerAction(testutils.Actions.Shared.StreamOutput, 'streamOutput');
  });

  it('Should output a stream', () => {

    const commandLine = Mebo.createHandler('commandLine');
    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
      '--type',
      'binary',
      '--file',
      testDataImagePath,
    ]);

    return (async () => {

      const result = await commandLine.execute('streamOutput');
      commandLine.output(result);

      // querying the checksum from the test image file
      const checksumAction = Mebo.createAction('file.checksum');
      checksumAction.input('file').setValue(testDataImagePath);
      const testImageFileChecksum = await checksumAction.execute();

      const streamChecksum = crypto.createHash('sha256').update(Buffer.concat(commandLine.stdout().data)).digest('hex');
      assert.equal(testImageFileChecksum, streamChecksum);
    })();
  });
});
