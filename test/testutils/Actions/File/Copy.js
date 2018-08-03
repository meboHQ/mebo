const fs = require('fs');
const os = require('os');
const path = require('path');
const Mebo = require('../../../../src');


describe('Copy Action:', () => {

  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'copyActionTest'));
  const filePath = path.join(temporaryFolder, 'file.foo');
  const targetFolder = path.join(temporaryFolder, 'A', 'B', 'C');
  const targetFilePath = path.join(targetFolder, 'targetFilePath.foo');

  before(() => {
    fs.writeFileSync(filePath, Array(1 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(filePath);
    fs.unlinkSync(targetFilePath);
    fs.rmdirSync(path.join(temporaryFolder, 'A', 'B', 'C'));
    fs.rmdirSync(path.join(temporaryFolder, 'A', 'B'));
    fs.rmdirSync(path.join(temporaryFolder, 'A'));
    fs.rmdirSync(temporaryFolder);
  });

  it('If createTargetDirectories is set to false it should fail to copy a file to a nonexistent target folder', (done) => {

    (async () => {

      const copyAction = Mebo.Action.create('file.copy');
      copyAction.input('createTargetDirectories').setValue(false);
      copyAction.input('sourceFile').setValue(filePath);
      copyAction.input('targetFile').setValue(`${targetFilePath}__`);

      await copyAction.run();

    })().then((result) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Checking if the file has been copied', () => {

    return (async () => {

      const copyAction = Mebo.Action.create('file.copy');
      copyAction.input('sourceFile').setValue(filePath);
      copyAction.input('targetFile').setValue(targetFilePath);

      await copyAction.run();

      // in case the file copy has failed, the stats will throw an exception when
      // querying it from a file that does not exist
      fs.lstatSync(targetFilePath);

    })();
  });
});
