const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const express = require('express'); // eslint-disable-line
const debug = require('debug')('Mebo');
const Mebo = require('../../../../src');


describe('Download Action:', () => {

  let server = null;
  let port = null;
  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'downloadActionTest'));
  const fileName = 'fileName.foo';
  const fileNameWithoutExt = 'fileName';

  before((done) => {

    // creating temporary files that will be used by the tests bellow (they get
    // removed automatically by the tmp library)
    fs.writeFileSync(path.join(temporaryFolder, fileName), Array(1 * 1024).join('0'));
    fs.writeFileSync(path.join(temporaryFolder, fileNameWithoutExt), Array(1).join('0'));

    const app = express();
    app.use('/', express.static(temporaryFolder));

    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    fs.unlinkSync(path.join(temporaryFolder, fileName));
    fs.unlinkSync(path.join(temporaryFolder, fileNameWithoutExt));
    fs.rmdirSync(temporaryFolder);

    if (server){
      server.close();
    }
  });

  it('If createTargetDirectories is set to false it should fail to download the URL to a nonexistent target folder', (done) => {

    (async () => {

      const downloadAction = Mebo.Action.create('file.download');

      downloadAction.input('createTargetDirectories').setValue(false);
      downloadAction.input('inputUrl').setValue(`http://localhost:${port}/${fileName}`);
      downloadAction.input('targetFolder').setValue(path.join(temporaryFolder, '/invalidSubDir'));

      await downloadAction.run();

    })().then((result) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      debug(err);
      done();
    });
  });

  it('Should download a file from an url creating the target folders', () => {

    return (async () => {

      const downloadAction = Mebo.Action.create('file.download');

      downloadAction.input('inputUrl').setValue(`http://localhost:${port}/${fileName}`);
      downloadAction.input('targetFolder').setValue(path.join(temporaryFolder, 'folder'));
      const downloadedFile = await downloadAction.run();

      assert.equal(path.extname(downloadedFile), '.foo');

      const checksumAction = Mebo.Action.create('file.checksum');
      checksumAction.input('file').setValue(downloadedFile);

      const result = await checksumAction.run();

      // no more need for this file
      fs.unlinkSync(downloadedFile);
      fs.rmdirSync(downloadAction.input('targetFolder').value());

      assert.equal('8f017d33568c8bad2c714c86c4418a1d21c7ce5a88f7f37622d423da5ada524e', result);

      return result;

    })();
  });

  it('Should download a file from an url without extension', () => {

    return (async () => {

      const downloadAction = Mebo.Action.create('file.download');

      downloadAction.input('inputUrl').setValue(`http://localhost:${port}/${fileNameWithoutExt}`);
      downloadAction.input('targetFolder').setValue(path.join(temporaryFolder, 'folder'));
      const downloadedFile = await downloadAction.run();

      assert.equal(path.extname(downloadedFile), '');

      const checksumAction = Mebo.Action.create('file.checksum');
      checksumAction.input('file').setValue(downloadedFile);

      const result = await checksumAction.run();

      // no more need for this file
      fs.unlinkSync(downloadedFile);
      fs.rmdirSync(downloadAction.input('targetFolder').value());

      assert.equal('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', result);

      return result;

    })();
  });

  it('Trying to download an invalid url', (done) => {

    (async () => {

      const downloadAction = Mebo.Action.create('file.download');
      downloadAction.input('inputUrl').setValue(`http://localhost:${port}/${fileName}_Invalid`);
      downloadAction.input('targetFolder').setValue(temporaryFolder);
      await downloadAction.run();

    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done();
    });
  });
});
