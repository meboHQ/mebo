const fs = require('fs');
const os = require('os');
const path = require('path');
const Mebo = require('../../../../src');


describe('Move Action:', () => {

  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'moveActionTest'));
  const sourceFilePath = path.join(temporaryFolder, 'fileA.foo');
  const targetFilePath = path.join(temporaryFolder, 'fileB.foo');

  before(() => {
    fs.writeFileSync(sourceFilePath, Array(1 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(targetFilePath);
    fs.rmdirSync(temporaryFolder);
  });

  it('Checking if the file has been moved', () => {

    return (async () => {

      const moveAction = Mebo.createAction('file.move');
      moveAction.input('sourceFile').setValue(sourceFilePath);
      moveAction.input('targetFile').setValue(targetFilePath);

      await moveAction.execute();

      fs.lstatSync(targetFilePath);

      return true;
    })();
  });
});
