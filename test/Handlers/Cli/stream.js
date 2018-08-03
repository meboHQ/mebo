const assert = require('assert');
const path = require('path');
const stream = require('stream');
const crypto = require('crypto');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');


describe('Cli Stream:', () => {

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

  const testDataImagePath = path.join(__dirname, '../../../testutils/data/image.png');

  before(() => {
    Mebo.Action.register(testutils.Actions.Shared.StreamOutput, 'streamOutput');
    Mebo.Handler.grantAction('cli', 'streamOutput');
  });

  it('Should output a stream', () => {

    const app = Mebo.Handler.create('cli');
    app.setStdout(new WriteStream());
    app.setStderr(new WriteStream());
    app.setArgs([
      'node',
      'file',
      '--type',
      'binary',
      '--file',
      testDataImagePath,
    ]);

    return (async () => {

      const result = await app.runAction('streamOutput');
      app.output(result);

      // querying the checksum from the test image file
      const checksumAction = Mebo.Action.create('file.checksum');
      checksumAction.input('file').setValue(testDataImagePath);
      const testImageFileChecksum = await checksumAction.run();

      const streamChecksum = crypto.createHash('sha256').update(Buffer.concat(app.stdout().data)).digest('hex');
      assert.equal(testImageFileChecksum, streamChecksum);
    })();
  });
});
