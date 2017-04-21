const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Mebo = require('../../../../src');


describe('Checksum Action:', () => {

  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'checksumActionTest'));
  const filePath = 'file.foo';

  before(() => {
    fs.writeFileSync(path.join(temporaryFolder, filePath), Array(1 * 1024 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(path.join(temporaryFolder, filePath));
    fs.rmdirSync(temporaryFolder);
  });

  it('Checking the hash generated by the action', () => {

    return (async () => {

      const checksumAction = Mebo.createAction('file.checksum');

      checksumAction.input('file').setValue(path.join(temporaryFolder, filePath));

      const result = await checksumAction.execute();
      assert.equal('4aef39e4090b33644513ab820b07ddfa7db4f8c9a3b201e2d789433d6d20becc', result);

      return result;
    })();
  });

  it('Should return the hash based on a custom algo', () => {

    return (async () => {

      const checksumAction = Mebo.createAction('file.checksum');
      checksumAction.input('algo').setValue('sha256');
      checksumAction.input('file').setValue(path.join(temporaryFolder, filePath));

      const result = await checksumAction.execute();
      assert.equal('4aef39e4090b33644513ab820b07ddfa7db4f8c9a3b201e2d789433d6d20becc', result);

      return result;

    })();
  });

  it('Should fail in trying to get a hash from a non existing file', (done) => {

    (async () => {

      const checksumAction = Mebo.createAction('file.checksum');
      checksumAction.input('file').assignProperty('exists', false);
      checksumAction.input('file').setValue(path.join(temporaryFolder, 'invalidFile.none'));

      await checksumAction.execute();

    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done();
    });
  });
});